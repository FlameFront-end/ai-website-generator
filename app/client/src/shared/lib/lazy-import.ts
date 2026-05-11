import type { ComponentType } from 'react'

type LazyModule = {
  default: ComponentType
}

export async function lazyImport(importer: () => Promise<LazyModule>) {
  const module = await importer()

  return {
    Component: module.default,
  }
}
