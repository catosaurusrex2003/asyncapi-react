export function scrollIntoViewById(
  id: string,
  options: ScrollIntoViewOptions = {},
): boolean {
  const element = document.getElementById(id);
  if (!element) {
    return false;
  }

  const {
    behavior = 'smooth',
    ...rest
  } = options;
  try {
    element.scrollIntoView({ behavior, ...rest });
    return true;
  } catch(err) {
    console.error(err)
    return false;
  }
}