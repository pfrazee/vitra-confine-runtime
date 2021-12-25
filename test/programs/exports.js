let i = 0
export function main (params, emit) {
  emit({op: 'foo', params})
  if (i === 1) {
    emit({op: 'bar'})
  }
  return ++i
}