// Mock ESM-only modules that are transitively imported but not used in e2e tests
jest.mock('pixelmatch', () => ({ __esModule: true, default: jest.fn() }));

import {
  ClassSerializerInterceptor,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { AuthService } from '../auth/auth.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AiService } from '../ai/ai.service';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';

const JWT_SECRET = 'e2e-test-secret';
const MOCK_USER = { id: 'user-1', email: 'test@test.com', avatarUrl: null };

function mockConfigService(): Partial<ConfigService> {
  return {
    get: jest.fn((key: string) => {
      if (key === 'app') {
        return { jwt: { secret: JWT_SECRET, expiresIn: '1h' } };
      }
      return undefined;
    }),
  };
}

describe('RunsController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let runsService: Record<string, jest.Mock>;
  let aiService: Record<string, jest.Mock>;

  beforeEach(async () => {
    runsService = {
      createRun: jest.fn(),
      getRuns: jest.fn(),
      getRun: jest.fn(),
      updateRun: jest.fn(),
      updateRunPinned: jest.fn(),
      deleteRun: jest.fn(),
      rebuildRun: jest.fn(),
      restartCurrentStep: jest.fn(),
      stopCurrentStep: jest.fn(),
      restartCodeStep: jest.fn(),
      approveStep: jest.fn(),
      requestEdit: jest.fn(),
      selectStyle: jest.fn(),
      getArtifactContent: jest.fn(),
      getArtifactFile: jest.fn(),
      getCodeFiles: jest.fn(),
      getCodeFileContent: jest.fn(),
      downloadCode: jest.fn(),
    };

    aiService = {
      clarifyBrief: jest.fn(),
    };

    const mockAuthService = {
      validateUser: jest.fn().mockResolvedValue({
        ...MOCK_USER,
        passwordHash: 'hash',
        runs: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [RunsController],
      providers: [
        { provide: RunsService, useValue: runsService },
        { provide: AiService, useValue: aiService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService() },
        JwtStrategy,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );

    const jwtService = moduleRef.get(JwtService);
    authToken = jwtService.sign({
      sub: MOCK_USER.id,
      email: MOCK_USER.email,
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Authentication guard
  // ---------------------------------------------------------------------------
  describe('Authentication', () => {
    it('should return 401 for unauthenticated GET /api/runs', async () => {
      await request(app.getHttpServer()).get('/api/runs').expect(401);
    });

    it('should return 401 for unauthenticated POST /api/runs', async () => {
      await request(app.getHttpServer())
        .post('/api/runs')
        .send({ brief: 'Build a landing page for my startup' })
        .expect(401);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/runs/brief/clarify
  // ---------------------------------------------------------------------------
  describe('POST /api/runs/brief/clarify', () => {
    it('should clarify a brief', async () => {
      const result = { status: 'ready', finalBrief: 'Improved brief text' };
      aiService.clarifyBrief.mockResolvedValue(result);

      const res = await request(app.getHttpServer())
        .post('/api/runs/brief/clarify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ brief: 'Build me a landing page' })
        .expect(201);

      expect(res.body).toEqual(result);
      expect(aiService.clarifyBrief).toHaveBeenCalledWith(
        'Build me a landing page',
        [],
        undefined,
      );
    });

    it('should pass siteLanguage and answers', async () => {
      aiService.clarifyBrief.mockResolvedValue({ status: 'ready' });

      await request(app.getHttpServer())
        .post('/api/runs/brief/clarify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          brief: 'Build a SaaS landing',
          siteLanguage: 'en',
          answers: [{ questionId: 'q1', question: 'What?', value: 'Answer' }],
        })
        .expect(201);

      expect(aiService.clarifyBrief).toHaveBeenCalledWith(
        'Build a SaaS landing',
        [{ questionId: 'q1', question: 'What?', value: 'Answer' }],
        'en',
      );
    });

    it('should return 400 for short brief', async () => {
      await request(app.getHttpServer())
        .post('/api/runs/brief/clarify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ brief: 'ab' })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/runs
  // ---------------------------------------------------------------------------
  describe('POST /api/runs', () => {
    it('should create a run', async () => {
      const created = { id: 'run-1', slug: 'run-001', status: 'queued' };
      runsService.createRun.mockResolvedValue(created);

      const res = await request(app.getHttpServer())
        .post('/api/runs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ brief: 'Build a modern SaaS landing page' })
        .expect(201);

      expect(res.body).toEqual(created);
      expect(runsService.createRun).toHaveBeenCalledWith(
        expect.objectContaining({ brief: 'Build a modern SaaS landing page' }),
        MOCK_USER.id,
      );
    });

    it('should accept optional displayName', async () => {
      runsService.createRun.mockResolvedValue({
        id: 'run-2',
        slug: 'run-002',
        status: 'queued',
      });

      await request(app.getHttpServer())
        .post('/api/runs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          brief: 'Build a modern SaaS landing page',
          displayName: 'My Project',
        })
        .expect(201);

      expect(runsService.createRun).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'My Project' }),
        MOCK_USER.id,
      );
    });

    it('should return 400 for short brief', async () => {
      await request(app.getHttpServer())
        .post('/api/runs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ brief: 'short' })
        .expect(400);
    });

    it('should return 400 for missing brief', async () => {
      await request(app.getHttpServer())
        .post('/api/runs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/runs
  // ---------------------------------------------------------------------------
  describe('GET /api/runs', () => {
    it('should return runs list', async () => {
      const runs = [
        { id: 'run-1', slug: 'run-001', status: 'completed' },
        { id: 'run-2', slug: 'run-002', status: 'queued' },
      ];
      runsService.getRuns.mockResolvedValue(runs);

      const res = await request(app.getHttpServer())
        .get('/api/runs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toEqual(runs);
      expect(runsService.getRuns).toHaveBeenCalledWith(MOCK_USER.id);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/runs/:id
  // ---------------------------------------------------------------------------
  describe('GET /api/runs/:id', () => {
    it('should return a single run', async () => {
      const run = { id: 'run-1', slug: 'run-001', status: 'completed' };
      runsService.getRun.mockResolvedValue(run);

      const res = await request(app.getHttpServer())
        .get('/api/runs/run-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toEqual(run);
      expect(runsService.getRun).toHaveBeenCalledWith('run-1', MOCK_USER.id);
    });

    it('should return 404 when run not found', async () => {
      runsService.getRun.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/api/runs/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/runs/:id
  // ---------------------------------------------------------------------------
  describe('PATCH /api/runs/:id', () => {
    it('should update a run', async () => {
      const updated = { id: 'run-1', displayName: 'New Name' };
      runsService.updateRun.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .patch('/api/runs/run-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ displayName: 'New Name' })
        .expect(200);

      expect(res.body).toEqual(updated);
      expect(runsService.updateRun).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({ displayName: 'New Name' }),
        MOCK_USER.id,
      );
    });

    it('should return 400 for too-long displayName', async () => {
      await request(app.getHttpServer())
        .patch('/api/runs/run-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ displayName: 'x'.repeat(81) })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /api/runs/:id/pinned
  // ---------------------------------------------------------------------------
  describe('PATCH /api/runs/:id/pinned', () => {
    it('should update pinned status', async () => {
      const updated = { id: 'run-1', isPinned: true };
      runsService.updateRunPinned.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .patch('/api/runs/run-1/pinned')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isPinned: true })
        .expect(200);

      expect(res.body).toEqual(updated);
      expect(runsService.updateRunPinned).toHaveBeenCalledWith(
        'run-1',
        true,
        MOCK_USER.id,
      );
    });

    it('should return 400 for non-boolean isPinned', async () => {
      await request(app.getHttpServer())
        .patch('/api/runs/run-1/pinned')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isPinned: 'yes' })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /api/runs/:id
  // ---------------------------------------------------------------------------
  describe('DELETE /api/runs/:id', () => {
    it('should delete a run', async () => {
      runsService.deleteRun.mockResolvedValue({ id: 'run-1', deleted: true });

      const res = await request(app.getHttpServer())
        .delete('/api/runs/run-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toEqual({ id: 'run-1', deleted: true });
      expect(runsService.deleteRun).toHaveBeenCalledWith('run-1', MOCK_USER.id);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/runs/:id/approve
  // ---------------------------------------------------------------------------
  describe('POST /api/runs/:id/approve', () => {
    it('should approve a step', async () => {
      runsService.approveStep.mockResolvedValue({ success: true });

      const res = await request(app.getHttpServer())
        .post('/api/runs/run-1/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ step: 'style' })
        .expect(201);

      expect(res.body).toEqual({ success: true });
      expect(runsService.approveStep).toHaveBeenCalledWith(
        'run-1',
        'style',
        MOCK_USER.id,
      );
    });

    it('should return 400 for invalid step', async () => {
      await request(app.getHttpServer())
        .post('/api/runs/run-1/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ step: 'invalid' })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/runs/:id/select-style
  // ---------------------------------------------------------------------------
  describe('POST /api/runs/:id/select-style', () => {
    it('should select a style variant', async () => {
      runsService.selectStyle.mockResolvedValue({ success: true });

      const res = await request(app.getHttpServer())
        .post('/api/runs/run-1/select-style')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ styleVariantId: 'variant-1' })
        .expect(201);

      expect(res.body).toEqual({ success: true });
      expect(runsService.selectStyle).toHaveBeenCalledWith(
        'run-1',
        'variant-1',
        MOCK_USER.id,
      );
    });

    it('should return 400 for missing styleVariantId', async () => {
      await request(app.getHttpServer())
        .post('/api/runs/run-1/select-style')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/runs/:id/edit-request
  // ---------------------------------------------------------------------------
  describe('POST /api/runs/:id/edit-request', () => {
    it('should submit an edit request', async () => {
      runsService.requestEdit.mockResolvedValue({ success: true });

      const res = await request(app.getHttpServer())
        .post('/api/runs/run-1/edit-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ step: 'code', instruction: 'Make the header bigger' })
        .expect(201);

      expect(res.body).toEqual({ success: true });
      expect(runsService.requestEdit).toHaveBeenCalledWith(
        'run-1',
        'code',
        'Make the header bigger',
        MOCK_USER.id,
      );
    });

    it('should return 400 for invalid step', async () => {
      await request(app.getHttpServer())
        .post('/api/runs/run-1/edit-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ step: 'unknown', instruction: 'something' })
        .expect(400);
    });

    it('should return 400 for short instruction', async () => {
      await request(app.getHttpServer())
        .post('/api/runs/run-1/edit-request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ step: 'code', instruction: 'ab' })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/runs/:id/rebuild
  // ---------------------------------------------------------------------------
  describe('POST /api/runs/:id/rebuild', () => {
    it('should rebuild a run', async () => {
      runsService.rebuildRun.mockResolvedValue({ success: true });

      const res = await request(app.getHttpServer())
        .post('/api/runs/run-1/rebuild')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(res.body).toEqual({ success: true });
      expect(runsService.rebuildRun).toHaveBeenCalledWith(
        'run-1',
        MOCK_USER.id,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/runs/:id/restart-current-step
  // ---------------------------------------------------------------------------
  describe('POST /api/runs/:id/restart-current-step', () => {
    it('should restart current step', async () => {
      runsService.restartCurrentStep.mockResolvedValue({ success: true });

      const res = await request(app.getHttpServer())
        .post('/api/runs/run-1/restart-current-step')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(res.body).toEqual({ success: true });
      expect(runsService.restartCurrentStep).toHaveBeenCalledWith(
        'run-1',
        MOCK_USER.id,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/runs/:id/stop-current-step
  // ---------------------------------------------------------------------------
  describe('POST /api/runs/:id/stop-current-step', () => {
    it('should stop current step', async () => {
      runsService.stopCurrentStep.mockResolvedValue({ success: true });

      const res = await request(app.getHttpServer())
        .post('/api/runs/run-1/stop-current-step')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(res.body).toEqual({ success: true });
      expect(runsService.stopCurrentStep).toHaveBeenCalledWith(
        'run-1',
        MOCK_USER.id,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/runs/:id/code-files
  // ---------------------------------------------------------------------------
  describe('GET /api/runs/:id/code-files', () => {
    it('should return code file list', async () => {
      const files = [{ path: 'src/app/page.tsx', size: 512 }];
      runsService.getCodeFiles.mockResolvedValue(files);

      const res = await request(app.getHttpServer())
        .get('/api/runs/run-1/code-files')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toEqual(files);
      expect(runsService.getCodeFiles).toHaveBeenCalledWith(
        'run-1',
        MOCK_USER.id,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/runs/:id/code-file
  // ---------------------------------------------------------------------------
  describe('GET /api/runs/:id/code-file', () => {
    it('should return code file content', async () => {
      const content = {
        path: 'src/app/page.tsx',
        content: 'export default function() {}',
      };
      runsService.getCodeFileContent.mockResolvedValue(content);

      const res = await request(app.getHttpServer())
        .get('/api/runs/run-1/code-file?path=src/app/page.tsx')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toEqual(content);
      expect(runsService.getCodeFileContent).toHaveBeenCalledWith(
        'run-1',
        'src/app/page.tsx',
        MOCK_USER.id,
      );
    });
  });
});
