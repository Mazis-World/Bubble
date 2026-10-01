import { notificationService } from './notifications';

describe('notification service push path', () => {
  const OriginalNotification = global.Notification;
  let instances;

  beforeEach(() => {
    instances = [];
    class MockNotification {
      constructor(title, options) {
        this.title = title;
        this.options = options;
        this.close = jest.fn();
        instances.push(this);
      }
    }
    MockNotification.permission = 'granted';
    global.Notification = MockNotification;
    notificationService.permission = 'granted';
    notificationService.preferences = {
      enabled: true,
      statusUpdates: true,
      sosAlerts: true,
    };
    notificationService.pushRegistration = null;
    delete navigator.serviceWorker;
  });

  afterEach(() => {
    global.Notification = OriginalNotification;
    delete navigator.serviceWorker;
  });

  test('isEnabled uses the live Notification.permission', () => {
    notificationService.permission = 'denied';
    global.Notification.permission = 'granted';
    notificationService.preferences.enabled = true;
    expect(notificationService.isEnabled()).toBe(true);
  });

  test('uses service worker showNotification instead of new Notification', async () => {
    const showNotification = jest.fn(() => Promise.resolve());
    const registration = { showNotification };
    navigator.serviceWorker = {
      register: jest.fn(() => Promise.resolve(registration)),
      getRegistration: jest.fn(() => Promise.resolve(registration)),
    };
    await notificationService.show('Status update', { body: 'At school', tag: 'status-1' });
    expect(showNotification).toHaveBeenCalledWith(
      'Status update',
      expect.objectContaining({ body: 'At school', tag: 'status-1' })
    );
    expect(instances).toHaveLength(0);
  });

  test('falls back to page Notification when no service worker is available', () => {
    notificationService.notifyStatusUpdate({
      id: 'n1',
      name: 'Alex',
      status: '🏫',
      statusText: 'At school',
    });
    expect(instances).toHaveLength(1);
    expect(instances[0].title).toContain('Alex');
  });
});
