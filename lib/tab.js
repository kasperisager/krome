import {NAMESPACE} from './event';

/**
 * @type {Map}
 */
const LISTENERS = new Map();

export class Tab {
  /**
   * Initialize a new tab.
   *
   * @param {Tab} tab
   */
  constructor(tab) {
    Object.assign(this, tab);
  }

  /**
   * Emit an event with an optional payload.
   *
   * @param {String} event
   * @param {*} [payload]
   * @return {Promise}
   */
  emit(event, payload) {
    return new Promise((resolve, reject) => {
      if (!event) {
        return resolve();
      }

      event = `${NAMESPACE}/${event}`;

      chrome.tabs.sendMessage(this.id, {event, payload}, () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }

        resolve();
      });
    });
  }

  /**
   * Update this tab.
   *
   * @see https://developer.chrome.com/extensions/tabs#method-update
   * @param {Object} opts
   * @return {Promise}
   */
  update(opts) {
    return new Promise((resolve, reject) => chrome.tabs.update(this.id, opts, tab => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      Object.assign(this, tab);
      resolve();
    }));
  }

  /**
   * Remove this tab.
   *
   * @see https://developer.chrome.com/extensions/tabs#method-remove
   * @return {Promise}
   */
  remove() {
    return new Promise((resolve, reject) => chrome.tabs.remove(this.id, () => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError));
      }

      resolve();
    }));
  }

  /**
   * Discard this tab.
   *
   * @see https://developer.chrome.com/extensions/tabs#method-discard
   * @return {Promise}
   */
  discard() {
    return new Promise((resolve, reject) => chrome.tabs.discard(this.id, tab => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      this.discarded = tab !== undefined;
      resolve();
    }));
  }

  /**
   * Reload this tab.
   *
   * @see https://developer.chrome.com/extensions/tabs#method-reload
   * @param {Object} opts
   * @return {Promise}
   */
  reload(opts) {
    return new Promise((resolve, reject) => chrome.tabs.reload(this.id, opts, () => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      resolve();
    }));
  }

  /**
   * Duplicate this
   *
   * @see https://developer.chrome.com/extensions/tabs#method-duplicate
   * @return {Promise}
   */
  duplicate() {
    return new Promise((resolve, reject) => chrome.tabs.duplicate(this.id, tab => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      resolve(new Tab(tab));
    }));
  }

  /**
   * Execute a script in this tab.
   *
   * @see https://developer.chrome.com/extensions/tabs#method-executeScript
   * @param {String} file
   * @param {Object} opts
   * @return {Promise}
   */
  execute(file, opts) {
    opts = Object.assign({}, opts, {file});

    return new Promise((resolve, reject) => chrome.tabs.executeScript(this.id, opts, results => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      resolve(results);
    }));
  }
}

/**
 * Get the current tab.
 *
 * @see https://developer.chrome.com/extensions/tabs#method-getCurrent
 * @return {Promise}
 */
export function current() {
  return new Promise(resolve => chrome.tabs.getCurrent(tab =>
    resolve(tab ? new Tab(tab) : undefined)
  ));
}

/**
 * Get the specified tab.
 *
 * @see https://developer.chrome.com/extensions/tabs#method-get
 * @param {Number} id
 * @return {Promise}
 */
export function get(id) {
  return new Promise((resolve, reject) => chrome.tabs.get(id, tab => {
    if (chrome.runtime.lastError) {
      return reject(new Error(chrome.runtime.lastError.message));
    }

    resolve(new Tab(tab));
  }));
}

/**
 * Query all tabs.
 *
 * @see https://developer.chrome.com/extensions/tabs#method-query
 * @param {Object} opts
 * @return {Promise}
 */
export function query(opts) {
  return new Promise((resolve, reject) => chrome.tabs.query(opts, (tabs = []) => {
    if (chrome.runtime.lastError) {
      return reject(new Error(chrome.runtime.lastError.message));
    }

    resolve(tabs.map(tab => new Tab(tab)));
  }));
}

/**
 * Create a new tab.
 *
 * @see https://developer.chrome.com/extensions/tabs#method-create
 * @param {Object} opts
 * @return {Promise}
 */
export function create(opts) {
  return new Promise((resolve, reject) => chrome.tabs.create(opts, tab => {
    if (chrome.runtime.lastError) {
      return reject(new Error(chrome.runtime.lastError.message));
    }

    resolve(new Tab(tab));
  }));
}

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

chrome.tabs.onCreated.addListener(
  /**
   * @see https://developer.chrome.com/extensions/tabs#event-onCreated
   * @param {Tab} tab
   */
  tab => {
    if (!LISTENERS.has('created')) {
      return;
    }

    for (const listener of LISTENERS.get('created')) {
      listener(new Tab(tab));
    }
  }
);

chrome.tabs.onUpdated.addListener(
  /**
   * @see https://developer.chrome.com/extensions/tabs#event-onUpdated
   * @param {Number} id
   * @param {Object} changes
   * @param {Tab} tab
   */
  (id, changes, tab) => {
    if (!LISTENERS.has('updated')) {
      return;
    }

    changes = new Map(Object.entries(changes));

    if (changes.size === 0) {
      return;
    }

    for (const listener of LISTENERS.get('updated')) {
      listener(new Tab(tab), changes);
    }
  }
);

chrome.tabs.onRemoved.addListener(
  /**
   * @see https://developer.chrome.com/extensions/tabs#event-onRemoved
   * @param {Number} id
   * @param {Object} info
   * @param {Number} info.windowId
   * @param {Boolean} info.isWindowClosing
   */
  (id, {windowId, isWindowClosing}) => {
    if (!LISTENERS.has('removed')) {
      return;
    }

    for (const listener of LISTENERS.get('removed')) {
      listener(id, windowId, isWindowClosing);
    }
  }
);

chrome.tabs.onReplaced.addListener(
  /**
   * @see https://developer.chrome.com/extensions/tabs#event-onReplaced
   * @param {Number} addedId
   * @param {Number} removedId
   */
  (addedId, removedId) => {
    if (!LISTENERS.has('replaced')) {
      return;
    }

    get(addedId).then(added => {
      for (const listener of LISTENERS.get('replaced')) {
        listener(added, removedId);
      }
    });
  }
);

chrome.tabs.onMoved.addListener(
  /**
   * @see https://developer.chrome.com/extensions/tabs#event-onMoved
   * @param {Number} id
   * @param {Object} info
   * @param {Number} info.windowId
   * @param {Number} info.fromIndex
   * @param {Number} info.toIndex
   */
  (id, {windowId, fromIndex, toIndex}) => {
    if (!LISTENERS.has('detached')) {
      return;
    }

    get(id).then(tab => {
      for (const listener of LISTENERS.get('replaced')) {
        listener(tab, windowId, fromIndex, toIndex);
      }
    });
  }
);

chrome.tabs.onAttached.addListener(
  /**
   * @see https://developer.chrome.com/extensions/tabs#event-onAttached
   * @param {Number} id
   * @param {Number} info.newWindowId
   * @param {Number} info.newPosition
   */
  (id, {newWindowId, newPosition}) => {
    if (!LISTENERS.has('attached')) {
      return;
    }

    get(id).then(tab => {
      for (const listener of LISTENERS.get('replaced')) {
        listener(tab, newWindowId, newPosition);
      }
    });
  }
);

chrome.tabs.onDetached.addListener(
  /**
   * @see https://developer.chrome.com/extensions/tabs#event-onDetached
   * @param {Number} id
   * @param {Number} info.oldWindowId
   * @param {Number} info.oldPosition
   */
  (id, {oldWindowId, oldPosition}) => {
    if (!LISTENERS.has('detached')) {
      return;
    }

    get(id).then(tab => {
      for (const listener of LISTENERS.get('replaced')) {
        listener(tab, oldWindowId, oldPosition);
      }
    });
  }
);

chrome.tabs.onActivated.addListener(
  /**
   * @see https://developer.chrome.com/extensions/tabs#event-onActivated
   * @param {Object} info
   * @param {Number} info.tabId
   * @param {Number} info.windowId
   */
  ({tabId, windowId}) => {
    if (!LISTENERS.has('activated')) {
      return;
    }

    get(tabId).then(tab => {
      for (const listener of LISTENERS.get('replaced')) {
        listener(tab, windowId);
      }
    });
  }
);

chrome.tabs.onHighlighted.addListener(
  /**
   * @see https://developer.chrome.com/extensions/tabs#event-onHighlighted
   * @param {Object} info
   * @param {Array<Number>} info.tabIds
   * @param {Number} info.windowId
   */
  ({tabIds, windowId}) => {
    if (!LISTENERS.has('highlighted')) {
      return;
    }

    Promise.all(tabIds.map(get)).then(tabs => {
      for (const listener of LISTENERS.get('replaced')) {
        listener(tabs, windowId);
      }
    });
  }
);

chrome.tabs.onZoomChange.addListener(
  /**
   * @see https://developer.chrome.com/extensions/tabs#event-onZoomChange
   * @param {Object} info
   * @param {Number} info.tabId
   * @param {Number} info.oldZoomFactor
   * @param {Number} info.newZoomFactor
   * @param {Object} info.zoomSettings
   */
  ({tabId, oldZoomFactor, newZoomFactor, zoomSettings}) => {
    if (!LISTENERS.has('zoomchange')) {
      return;
    }

    if (oldZoomFactor === newZoomFactor) {
      return;
    }

    zoomSettings = new Map(Object.entries(zoomSettings));

    get(tabId).then(tab => {
      for (const listener of LISTENERS.get('replaced')) {
        listener(
          tab,
          oldZoomFactor,
          newZoomFactor,
          zoomSettings
        );
      }
    });
  }
);
