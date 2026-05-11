import styles from './FullErrorScreen.module.scss'

export function FullErrorScreen() {
  return (
    <div className={styles.screen}>
      <h1>Что-то пошло не так</h1>
      <p>Перезагрузите страницу или вернитесь к списку запусков.</p>
    </div>
  )
}
