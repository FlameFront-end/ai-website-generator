import styles from './FullErrorScreen.module.scss'

export function FullErrorScreen() {
  return (
    <div className={styles.screen}>
      <h1>Something went wrong</h1>
      <p>Reload the page or return to the runs list.</p>
    </div>
  )
}
