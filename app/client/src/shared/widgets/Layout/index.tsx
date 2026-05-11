import type { ReactNode } from 'react'

import styles from './Layout.module.scss'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div>
          <strong>ИИ-генератор сайтов</strong>
          <span>Визуальный прототип</span>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
