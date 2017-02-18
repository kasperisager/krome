/**
 * @type {String}
 */
const NAMESPACE = 'channel';

/**
 * @type {Map}
 */
const HANDLERS = new Map();

class Channel {
  /**
   * Initialise a new channel using the given port.
   *
   * @param {Port} port
   */
  constructor(port) {
    this.name = port.name;
    this.port = port;
    this.listeners = new Map();

    const invoke = (event, payload, sender) => {
      const {listeners} = this;

      if (listeners.has(event)) {
        for (const listener of listeners.get(event)) {
          listener(payload, sender);
        }
      }
    };

    this.port.onMessage.addListener(({event, payload}, {sender}) => {
      invoke(event, payload, sender);
    });

    this.port.onDisconnect.addListener(() => {
      invoke('disconnect');
    });
  }

  /**
   * Attach an event listener.
   *
   * @param {String} event
   * @param {Function} listener
   */
  on(event, listener) {
    const {listeners} = this;

    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }

    listeners.get(event).add(listener);
  }

  /**
   * Attach an event listener that is at most invoked once.
   *
   * @param {String} event
   * @param {Function} listener
   */
  once(event, listener) {
    const wrapped = (payload, sender) => {
      listener(payload, sender);
      this.off(event, wrapped);
    };

    if (listener) {
      this.on(event, wrapped);
    } else {
      return new Promise(resolve => {
        listener = resolve;
        this.on(event, wrapped);
      });
    }
  }

  /**
   * Detach an event listener.
   *
   * @param {String} event
   * @param {Function} listener
   */
  off(event, listener) {
    const {listeners} = this;

    if (listeners.has(event)) {
      listeners.get(event).delete(listener);
    }
  }

  /**
   * Emit an event with an optional payload.
   *
   * @param {String} event
   * @param {*} [payload]
   */
  emit(event, payload) {
    // The disconnect event is reserved for Chrome so don't allow manually
    // emitting it.
    if (event !== 'disconnect') {
      this.port.postMessage({event, payload});
    }
  }
}

function create(name, port = chrome.runtime.connect({name})) {
  const channel = new Channel(port);

  if (HANDLERS.has(name)) {
    for (const handler of HANDLERS.get(name)) {
      handler(channel);
    }
  }

  return channel;
}

/**
 * Connect to a named channel.
 *
 * @param {String} name
 * @param {Function} handler
 */
export function connect(name, handler) {
  name = `${NAMESPACE}$${name}`;

  let background;
  try {
    background = !chrome.runtime.getBackgroundPage(e => e);
  } catch (err) {}

  // If a connection is attempted from a background page store the handler for
  // invocation later as either a content script or a devtools page will have to
  // initialize the channel first.
  if (background) {
    if (!HANDLERS.has(name)) {
      HANDLERS.set(name, new Set());
    }

    HANDLERS.get(name).add(handler);
  } else {
    handler(create(name));
  }
}

/**
 * Disconnect an existing channel.
 *
 * @param {Channel} channel
 */
export function disconnect(channel) {
  if (HANDLERS.has(channel.name)) {
    HANDLERS.delete(channel.name);
  }

  channel.port.disconnect();
}

chrome.runtime.onConnect.addListener(
  /**
   * @param {Port} port
   */
  port => {
    const {name} = port;

    if (name.startsWith(NAMESPACE)) {
      create(name, port);
    }
  }
);
