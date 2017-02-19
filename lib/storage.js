/**
 * @type {Map}
 */
const LISTENERS = new Map();

/**
 * Get the value of a key.
 *
 * @param {String} key
 * @param {Object} opts
 * @return {Promise}
 */
export function get(key, {sync = false} = {}) {
  const area = sync ? chrome.storage.sync : chrome.storage.local;

  return new Promise((resolve, reject) => area.get(key, item => {
    if (chrome.runtime.lastError) {
      reject(chrome.runtime.lastError);
    } else {
      resolve(item[key]);
    }
  }));
}

/**
 * Set the value of a key.
 *
 * @param {String} key
 * @param {String} value
 * @param {Object} opts
 * @return {Promise}
 */
export function set(key, value, {sync = false} = {}) {
  const area = sync ? chrome.storage.sync : chrome.storage.local;

  return new Promise((resolve, reject) => area.set({[key]: value}, () => {
    if (chrome.runtime.lastError) {
      reject(chrome.runtime.lastError);
    } else {
      resolve(value);
    }
  }));
}

/**
 * Remove all keys from storage.
 *
 * @param {Object} opts
 * @return {Promise}
 */
export function clear({sync = false} = {}) {
  const area = sync ? chrome.storage.sync : chrome.storage.local;

  return new Promise((resolve, reject) => area.clear(() => {
    if (chrome.runtime.lastError) {
      reject(chrome.runtime.lastError);
    } else {
      resolve();
    }
  }));
}

/**
 * Attach an event listener.
 *
 * @param {String} event
 * @param {Object} [opts]
 * @param {Function} listener
 */
export function on(event, opts, listener) {
  if (!listener) {
    listener = opts;
    opts = {};
  }

  if (!event || !listener || listener.constructor !== Function) {
    return;
  }

  const {sync = true, local = true} = opts;

  if (!LISTENERS.has(event)) {
    LISTENERS.set(event, new Map());
  }

  LISTENERS.get(event).set(listener, {sync, local});
}

/**
 * Attach an event listener that is at most invoked once.
 *
 * @param {String} event
 * @param {Object} [opts]
 * @param {Function} listener
 * @return {Promise}
 */
export function once(event, opts, listener) {
  if (!listener) {
    listener = opts;
    opts = {};
  }

  if (!event) {
    return;
  }

  const wrapped = (payload, sender) => {
    listener(payload, sender);
    off(event, wrapped);
  };

  if (listener && listener.constructor === Function) {
    on(event, opts, wrapped);
  } else {
    return new Promise(resolve => {
      listener = resolve;
      on(event, opts, wrapped);
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

chrome.storage.onChanged.addListener(
  /**
   * @param {Object} changes
   * @param {String} area
   */
  (changes, area) => {
    const event = 'changed';

    if (!LISTENERS.has(event)) {
      return;
    }

    const keys = Object.keys(changes);

    for (const [listener, {sync, local}] of LISTENERS.get(event)) {
      if ((area === 'sync' && !sync) || (area === 'local' && !local)) {
        continue;
      }

      for (const key of keys) {
        const {oldValue, newValue} = changes[key];

        listener(key, oldValue, newValue);
      }
    }
  }
);
