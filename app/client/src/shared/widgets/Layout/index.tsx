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
          <strong>AI Website Generator</strong>
          <span>Visual-first MVP</span>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
