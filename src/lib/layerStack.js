// Open sheets and modals, in the order they opened. Escape closes only the topmost one; before
// this, a modal opened over a sheet stayed open while the sheet underneath closed.
const stack = []

export function openLayer(id) {
  stack.push(id)
  return () => {
    const i = stack.lastIndexOf(id)
    if (i !== -1) stack.splice(i, 1)
  }
}

export function isTopLayer(id) {
  return stack.length > 0 && stack[stack.length - 1] === id
}
