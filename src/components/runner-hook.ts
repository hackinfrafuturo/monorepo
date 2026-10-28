/** Observe cached/nested references too; this is client telemetry, not bot authentication. */
export function installRunnerHook<T extends object>(state: T, onAccess: () => void) {
  const proxies = new WeakMap<object, object>()
  const observe = <V extends object>(value: V): V => {
    const existing = proxies.get(value)
    if (existing) return existing as V
    const proxy = new Proxy(value, {
      get(target, key, receiver) {
        onAccess()
        const result = Reflect.get(target, key, receiver)
        return result !== null && typeof result === 'object' ? observe(result) : result
      },
      set(target, key, value, receiver) {
        onAccess()
        return Reflect.set(target, key, value, receiver)
      },
    })
    proxies.set(value, proxy)
    return proxy
  }
  const observed = observe(state)
  const get = () => { onAccess(); return observed }
  Object.defineProperty(window, '__runner', { configurable: true, get })
  return () => {
    // Inspect the descriptor, without reading the hook and falsely marking a run on cleanup.
    if (Object.getOwnPropertyDescriptor(window, '__runner')?.get === get) {
      Reflect.deleteProperty(window, '__runner')
    }
  }
}
