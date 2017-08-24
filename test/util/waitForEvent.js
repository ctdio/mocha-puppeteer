module.exports = async function waitForEvent (emitter, eventName, filterFunction) {
  return new Promise((resolve) => {
    const handler = (event) => {
      if (filterFunction) {
        if (filterFunction(event)) {
          emitter.removeListener(eventName, handler)
          resolve(event)
        }
      } else {
        emitter.removeListener(eventName, handler)
        resolve(event)
      }
    }

    emitter.on(eventName, handler)
  })
}
