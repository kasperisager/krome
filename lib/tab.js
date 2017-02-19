import {NAMESPACE} from './event';

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
   */
  emit(event, payload) {
    if (event) {
      chrome.tabs.sendMessage(this.id, {event: `${NAMESPACE}/${event}`, payload});
    }
  }

  /**
   * Update this tab.
   *
   * @see https://developer.chrome.com/extensions/tabs#method-update
   * @param {Object} opts
   * @return {Promise}
   */
  update(opts) {
    return new Promise(resolve => chrome.tabs.update(this.id, opts, tab => {
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
    return new Promise(resolve => chrome.tabs.remove(this.id, resolve));
  }

  /**
   * Discard this tab.
   *
   * @see https://developer.chrome.com/extensions/tabs#method-discard
   * @return {Promise}
   */
  discard() {
    return new Promise((resolve, reject) => chrome.tabs.discard(this.id, tab => {
      if (tab) {
        this.discarded = tab.discarded;
        resolve();
      } else {
        reject();
      }
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
    return new Promise(resolve => chrome.tabs.reload(this.id, opts, resolve));
  }

  /**
   * Duplicate this
   *
   * @see https://developer.chrome.com/extensions/tabs#method-duplicate
   * @return {Promise}
   */
  duplicate() {
    return new Promise(resolve => chrome.tabs.duplicate(this.id, tab => {
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
    return new Promise(resolve => chrome.tabs.executeScript(
      this.id,
      Object.assign({}, opts, {file}),
      resolve
    ));
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
  return new Promise(resolve => chrome.tabs.get(id, tab =>
    resolve(tab ? new Tab(tab) : undefined)
  ));
}

/**
 * Query all tabs.
 *
 * @see https://developer.chrome.com/extensions/tabs#method-query
 * @param {Object} opts
 * @return {Promise}
 */
export function query(opts) {
  return new Promise(resolve => chrome.tabs.query(opts, (tabs = []) =>
    resolve(tabs.map(tab => new Tab(tab)))
  ));
}

/**
 * Create a new tab.
 *
 * @see https://developer.chrome.com/extensions/tabs#method-create
 * @param {Object} opts
 * @return {Promise}
 */
export function create(opts) {
  return new Promise(resolve => chrome.tabs.create(opts, tab =>
    resolve(tab)
  ));
}
