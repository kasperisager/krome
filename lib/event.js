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

  if (!event) {
    return;
  }

  event = `${NAMESPACE}/${event}`;

  return new Promise((resolve, reject) => {
    const handler = response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    };

    if (tab) {
      chrome.tabs.sendMessage(tab, {event, payload}, handler);
    } else {
      chrome.runtime.sendMessage({event, payload}, handler);
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
  ({event, payload} = {}, sender, respond) => {
    if (!event || !event.startsWith(NAMESPACE)) {
      return;
    }

    event = event.replace(`${NAMESPACE}/`, '');

    if (!LISTENERS.has(event)) {
      return respond();
    }

    const responses = [];

    for (const listener of LISTENERS.get(event)) {
      const response = listener(payload, sender);

      if (response !== undefined) {
        responses.push(response.constructor === Promise ?
          response :
          Promise.resolve(response)
        );
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
