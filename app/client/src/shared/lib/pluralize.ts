/**
 * Russian pluralization.
 * Returns the correct form for count:
 *   pluralize(1, 'вопрос', 'вопроса', 'вопросов') → 'вопрос'
 *   pluralize(3, 'вопрос', 'вопроса', 'вопросов') → 'вопроса'
 *   pluralize(5, 'вопрос', 'вопроса', 'вопросов') → 'вопросов'
 */
export function pluralize(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const remainder = count % 10;
  const hundredRemainder = count % 100;

  if (remainder === 1 && hundredRemainder !== 11) return one;
  if (
    [2, 3, 4].includes(remainder) &&
    ![12, 13, 14].includes(hundredRemainder)
  ) {
    return few;
  }

  return many;
}
