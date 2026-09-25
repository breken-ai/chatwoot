import { mount, flushPromises } from '@vue/test-utils';
import MessageList from '../MessageList.vue';
import MessageApi from 'dashboard/api/inbox/message.js';

vi.mock('dashboard/api/inbox/message.js', () => ({
  default: { getPreviousMessages: vi.fn() },
}));
vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: () => ({ value: { id: 10, messages: [] } }),
}));
vi.mock('dashboard/composables/useTransformKeys', () => ({
  useCamelCase: value => value,
}));

const mountList = messages =>
  mount(MessageList, {
    props: { messages, currentUserId: 1 },
    global: {
      stubs: {
        Message: {
          props: ['inReplyTo'],
          template:
            '<div class="message">{{ inReplyTo?.content || "missing" }}</div>',
        },
      },
    },
  });

const replyingMessage = (id, content = 'reply') => ({
  id,
  content,
  contentAttributes: { inReplyTo: 42 },
});

describe('MessageList quoted-message lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries a transient failure when the conversation rerenders', async () => {
    MessageApi.getPreviousMessages
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({
        data: { payload: [{ id: 42, content: 'original message' }] },
      });
    const wrapper = mountList([replyingMessage(100)]);
    await flushPromises();

    await wrapper.setProps({ messages: [replyingMessage(100, 'updated')] });
    await flushPromises();

    expect(MessageApi.getPreviousMessages).toHaveBeenCalledTimes(2);
    expect(wrapper.find('.message').text()).toBe('original message');
  });

  it('shares an in-flight lookup between replies to the same message', async () => {
    MessageApi.getPreviousMessages.mockImplementation(
      () => new Promise(() => {})
    );

    mountList([replyingMessage(100), replyingMessage(101)]);
    await Promise.resolve();

    expect(MessageApi.getPreviousMessages).toHaveBeenCalledTimes(1);
  });
});
