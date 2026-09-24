import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import MessageMeta from '../MessageMeta.vue';
import { provideMessageContext } from '../provider.js';

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => ({ value: [] }),
}));

vi.mock('dashboard/composables/useInbox', () => ({
  useInbox: () =>
    Object.fromEntries(
      [
        'isAFacebookInbox',
        'isALineChannel',
        'isAPIInbox',
        'isASmsInbox',
        'isATelegramChannel',
        'isATwilioChannel',
        'isAWebWidgetInbox',
        'isAWhatsAppChannel',
        'isAnEmailChannel',
        'isAnInstagramChannel',
        'isATiktokChannel',
      ].map(key => [key, { value: false }])
    ),
}));

vi.mock('shared/composables/useExactTimestamp', () => ({
  useExactTimestamp: () => timestamp => `exact-${timestamp}`,
}));

const mountMeta = externalCreatedAt => {
  const Host = defineComponent({
    components: { MessageMeta },
    setup() {
      provideMessageContext({
        createdAt: ref(1_757_000_000),
        contentAttributes: ref({ externalCreatedAt }),
        isPrivate: ref(true),
        status: ref('sent'),
        sourceId: ref(''),
        messageType: ref(0),
      });
    },
    template: '<MessageMeta />',
  });

  return mount(Host, {
    global: { stubs: { MessageStatus: true } },
  });
};

describe('MessageMeta', () => {
  it('shows the imported message timestamp instead of the replay timestamp', () => {
    const wrapper = mountMeta('2020-01-02T03:04:00Z');

    expect(wrapper.find('time').text()).toContain('2020');
  });

  it('accepts an external Unix timestamp and falls back on an invalid value', () => {
    expect(mountMeta(1_577_934_240).find('time').text()).toContain('2020');
    expect(mountMeta('not-a-date').find('time').text()).toContain('2025');
  });
});
