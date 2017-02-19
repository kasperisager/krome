import test from 'ava';
import {spy} from 'sinon';
import {on, once, emit, off, NAMESPACE} from '../lib/event';

function dispatch(event, payload) {
  chrome.runtime.onMessage.addListener.callArgWith(0, {event: `${NAMESPACE}/${event}`, payload}, 'sender');
}

test.serial('emit() emits a runtime event with a payload', async t => {
  emit('foo', 'bar');

  t.true(
    chrome.runtime.sendMessage
      .withArgs({event: `${NAMESPACE}/foo`, payload: 'bar'})
      .calledOnce
  );
});

test.serial('on() attaches an event listener', async t => {
  const listener = spy();

  on('foo', listener);

  dispatch('foo', 'bar');

  t.true(listener.withArgs('bar', 'sender').calledOnce);

  off('foo', listener);
});

test.serial('on() support multiple event listeners for the same event', async t => {
  const listener1 = spy();
  const listener2 = spy();

  on('foo', listener1);
  on('foo', listener2);

  dispatch('foo', 'bar');

  t.true(listener1.withArgs('bar', 'sender').calledOnce);
  t.true(listener2.withArgs('bar', 'sender').calledOnce);

  off('foo', listener1);
  off('foo', listener2);
});

test.serial('once() attaches an event listener that is invoked at most once', async t => {
  const listener = spy();

  once('foo', listener);

  dispatch('foo', 'bar');
  dispatch('foo', 'bar');
  dispatch('foo', 'bar');

  t.true(listener.withArgs('bar', 'sender').calledOnce);
});

test.serial('once() optionally returns a promise if no listener is specified', async t => {
  const promise = once('foo');

  dispatch('foo', 'bar');

  t.is(await promise, 'bar');
});

test.serial('off() detaches an event listener', async t => {
  const listener = spy();

  on('foo', listener);
  off('foo', listener);

  dispatch('foo', 'bar');

  t.is(listener.callCount, 0);
});

test.serial('off() does nothing if detaching an already detached listener', async t => {
  const listener = spy();

  off('foo', listener);

  dispatch('foo', 'bar');

  t.is(listener.callCount, 0);
});
