/**
 * @type {Map}
 */
const LISTENERS = new Map();

/**
 * @type {String}
 */
export const NAMESPACE = '@krome/event';

/**
 * Attach an event listener.
 *
 * @param {String} event
 * @param {Function} listener
 */
export function on(event, listener) {
  if (!event || !listener || listener.constructor !== Function) {
    return;
  }

  if (!LISTENERS.has(event)) {
    LISTENERS.set(event, new Set());
  }

  LISTENERS.get(event).add(listener);
}

/**
 * Attach an event listener that is at most invoked once.
 *
 * @param {String} event
 * @param {Function} listener
 * @return {Promise}
 */
export function once(event, listener) {
  if (!event) {
    return;
  }

  const wrapped = (payload, sender) => {
    listener(payload, sender);
    off(event, wrapped);
  };

  if (listener && listener.constructor === Function) {
    on(event, wrapped);
  } else {
    return new Promise(resolve => {
      listener = resolve;
      on(event, wrapped);
    });
  }
}

/**
 * Detach an event listener.
 *
 * @param {String} event
 * @param {Function} listener
 */
export function off(event, listener) {
  if (!event || !listener || listener.constructor !== Function) {
    return;
  }

  if (LISTENERS.has(event)) {
    LISTENERS.get(event).delete(listener);
  }
}

/**
 * Emit an event with an optional payload.
 *
 * @param {String} event
 * @param {*} [payload]
 */
export function emit(event, payload) {
  if (event) {
    chrome.runtime.sendMessage({event: `${NAMESPACE}/${event}`, payload});
  }
}

chrome.runtime.onMessage.addListener(
  /**
   * @param {Object} message
   * @param {String} message.event
   * @param {*} message.payload
   * @param {Tab} sender
   */
  ({event, payload} = {}, sender) => {
    if (!event || !event.startsWith(NAMESPACE)) {
      return;
    }

    event = event.replace(`${NAMESPACE}/`, '');

    if (!LISTENERS.has(event)) {
      return;
    }

    for (const listener of LISTENERS.get(event)) {
      listener(payload, sender);
    }
  }
);
