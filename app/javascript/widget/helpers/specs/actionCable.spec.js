import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import ActionCableConnector from '../actionCable';

const cable = vi.hoisted(() => ({
  create: vi.fn(() => ({})),
  remove: vi.fn(),
}));

vi.mock('@rails/actioncable', () => ({
  createConsumer: () => ({
    subscriptions: { create: cable.create, remove: cable.remove },
    disconnect: vi.fn(),
  }),
}));

describe('Widget ActionCableConnector', () => {
  let app;
  let mockDispatch;
  let connector;

  beforeEach(() => {
    vi.useFakeTimers();
    mockDispatch = vi.fn();
    app = {
      $store: {
        dispatch: mockDispatch,
        getters: {
          getCurrentAccountId: 1,
          getCurrentUserID: 1,
        },
      },
    };
    connector = new ActionCableConnector(app, 'test-token');
    mockDispatch.mockClear();
  });

  afterEach(() => {
    delete window.actionCable;
    delete window.chatwootPubsubToken;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('replaces the subscription when the contact inbox token changes', () => {
    window.actionCable = connector;
    const initialSubscription = connector.subscription;

    ActionCableConnector.refreshConnector('new-token');

    expect(cable.remove).toHaveBeenCalledWith(initialSubscription);
    expect(cable.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ pubsub_token: 'new-token' }),
      expect.any(Object)
    );
  });

  it('keeps the current subscription when the token is unchanged', () => {
    window.actionCable = connector;

    ActionCableConnector.refreshConnector('test-token');

    expect(cable.remove).not.toHaveBeenCalled();
  });

  it('updates the startup token before the connector exists', () => {
    ActionCableConnector.refreshConnector('new-token');

    expect(window.chatwootPubsubToken).toBe('new-token');
  });

  it('registers the conversation.status_changed event handler', () => {
    expect(connector.events['conversation.status_changed']).toBe(
      connector.onStatusChange
    );
  });

  it('re-fetches conversation attributes on reconnect so a status change missed while disconnected is reflected', () => {
    connector.onReconnect();

    expect(mockDispatch).toHaveBeenCalledWith(
      'conversation/syncLatestMessages'
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      'conversationAttributes/getAttributes'
    );
  });
});
