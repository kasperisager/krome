/**
 * @type {Map}
 */
const LISTENERS = new Map();

/**
 * Attach an event listener.
 *
 * @param {String} event
 * @param {Function} listener
 */
export function on(event, listener) {
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
 */
export function once(event, listener) {
  const wrapped = (payload, sender) => {
    listener(payload, sender);
    off(event, wrapped);
  };

  if (listener) {
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
  if (LISTENERS.has(event)) {
    LISTENERS.get(event).delete(listener);
  }
}

/**
 * Clear all listeners for an event.
 *
 * @param {String} event
 */
export function clear(event) {
  if (LISTENERS.has(event)) {
    LISTENERS.delete(event);
  }
}

/**
 * Emit an event with an optional payload.
 *
 * @param {Number} [tab]
 * @param {String} event
 * @param {*} [payload]
 * @return {Promise}
 */
export function emit(tab, event, payload) {
  // Move around parameters if no tab ID is provided.
  if (typeof tab !== 'number') {
    payload = event;
    event = tab;
    tab = undefined;
  }

  return new Promise(resolve => {
    if (tab) {
      chrome.tabs.sendMessage(tab, {event, payload}, resolve);
    } else {
      chrome.runtime.sendMessage({event, payload}, resolve);
    }
  });
}

chrome.runtime.onMessage.addListener(
  /**
   * @param {Object} message
   * @param {String} message.event
   * @param {*} message.payload
   * @param {Tab} sender
   * @param {Function} respond
   */
  ({event, payload}, sender, respond) => {
    if (!LISTENERS.has(event)) {
      return respond();
    }

    const responses = [];

    for (const listener of LISTENERS.get(event)) {
      let response = listener(payload, sender);

      if (response !== undefined) {
        if (response.constructor !== Promise) {
          response = Promise.resolve(response);
        }

        responses.push(response);
      }
    }

    switch (responses.length) {
      // If no responses were made, make an empty response to signal that all
      // listeners have completed.
      case 0:
        return respond();

      // If a single response was made, resolve just the first one and respond.
      // This is useful for sending an event to a single tab or window and
      // collecting the response, which is the behaviour supported by Chrome out
      // of the box.
      case 1:
        responses[0].then(respond);
        break;

      // If multiple responses were made, resolve all of them and respond. This
      // is for sending an event across multiple tabs or windows and collecting
      // all responses, which is not supported directly by Chrome.
      default:
        Promise.all(responses).then(respond);
    }

    // Return a truthy value to signal to Chrome that the response will be async.
    return true;
  }
);
