import test from 'ava';
import {spy, stub} from 'sinon';
import {on, once, emit, off, clear} from '../lib/event';

async function dispatch(event, payload) {
  return new Promise(resolve =>
    chrome.runtime.onMessage.dispatch({event, payload}, 'sender', resolve)
  );
}

test.beforeEach(() => clear('foo'));

test.serial('emit() emits a runtime event with a payload', async t => {
  chrome.runtime.sendMessage.callsArgWith(1, 'barbaz');

  t.is(await emit('foo', 'bar'), 'barbaz');

  t.true(
    chrome.runtime.sendMessage
      .withArgs({event: 'foo', payload: 'bar'})
      .calledOnce
  );
});

test.serial('emit() emits a tab event with a payload', async t => {
  chrome.tabs.sendMessage.callsArgWith(2, 'barbaz');

  t.is(await emit(1, 'foo', 'bar'), 'barbaz');

  t.true(
    chrome.tabs.sendMessage
      .withArgs(1, {event: 'foo', payload: 'bar'})
      .calledOnce
  );
});

test.serial('on() attaches an event listener', async t => {
  const listener = spy();

  on('foo', listener);

  await dispatch('foo', 'bar');

  t.true(listener.withArgs('bar', 'sender').calledOnce);
});

test.serial('on() support multiple event listeners for the same event', async t => {
  const listener1 = spy();
  const listener2 = spy();

  on('foo', listener1);
  on('foo', listener2);

  await dispatch('foo', 'bar');

  t.true(listener1.withArgs('bar', 'sender').calledOnce);
  t.true(listener2.withArgs('bar', 'sender').calledOnce);
});

test.serial('on() supports single responses from a single listener', async t => {
  const listener = stub().returns('baz');

  on('foo', listener);

  t.is(await dispatch('foo', 'bar'), 'baz');
  t.true(listener.withArgs('bar', 'sender').calledOnce);
});

test.serial('on() supports single responses from a single of multiple listeners', async t => {
  const listener1 = stub().returns('baz');
  const listener2 = stub().returns();

  on('foo', listener1);
  on('foo', listener2);

  t.is(await dispatch('foo', 'bar'), 'baz');
  t.true(listener1.withArgs('bar', 'sender').calledOnce);
  t.true(listener2.withArgs('bar', 'sender').calledOnce);
});

test.serial('on() supports multiple responses from multiple listeners', async t => {
  const listener1 = stub().returns('baz');
  const listener2 = stub().returns('fez');

  on('foo', listener1);
  on('foo', listener2);

  t.deepEqual(await dispatch('foo', 'bar'), ['baz', 'fez']);
  t.true(listener1.withArgs('bar', 'sender').calledOnce);
  t.true(listener2.withArgs('bar', 'sender').calledOnce);
});

test.serial('on() supports responding with promises', async t => {
  const listener = stub().returns(Promise.resolve('baz'));

  on('foo', listener);

  t.is(await dispatch('foo', 'bar'), 'baz');
  t.true(listener.withArgs('bar', 'sender').calledOnce);
});

test.serial('once() attaches an event listener that is invoked at most once', async t => {
  const listener = spy();

  once('foo', listener);

  await dispatch('foo', 'bar');
  await dispatch('foo', 'bar');
  await dispatch('foo', 'bar');

  t.true(listener.withArgs('bar', 'sender').calledOnce);
});

test.serial('once() optionally returns a promise if no listener is specified', async t => {
  const promise = once('foo');

  await dispatch('foo', 'bar');

  t.is(await promise, 'bar');
});

test.serial('off() detaches an event listener', async t => {
  const listener = spy();

  on('foo', listener);
  off('foo', listener);

  await dispatch('foo', 'bar');

  t.is(listener.callCount, 0);
});

test.serial('off() does nothing if detaching an already detached listener', async t => {
  const listener = spy();

  off('foo', listener);

  await dispatch('foo', 'bar');

  t.is(listener.callCount, 0);
});
