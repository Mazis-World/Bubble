import { fireEvent, render, screen } from '@testing-library/react';
import SosButton from '../components/sos/SosButton';
import { notificationService } from './notifications';
import { parseSosDeepLink } from './sos';

describe('SOS hold button', () => {
  test('does not activate on a short tap', () => {
    const onHoldComplete = jest.fn();
    render(<SosButton onHoldComplete={onHoldComplete} />);
    const button = screen.getByRole('button', { name: /sos/i });
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);
    expect(onHoldComplete).not.toHaveBeenCalled();
  });
});

describe('SOS notification delivery', () => {
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
    notificationService.preferences = { enabled: true, sosAlerts: true };
  });

  afterEach(() => {
    global.Notification = OriginalNotification;
  });

  test('shows the SOS alert and deep-links on click', () => {
    const onOpen = jest.fn();
    notificationService.notifySosAlert(
      { name: 'Sam', photoUrl: '/photo.png' },
      { sosId: 'sos-9', bubbleId: 'bubble-1' },
      onOpen
    );
    expect(instances).toHaveLength(1);
    expect(instances[0].title).toBe('🚨 SOS ALERT');
    expect(instances[0].options.body).toContain('Sam has activated an SOS alert');
    instances[0].onclick({ preventDefault: jest.fn() });
    expect(onOpen).toHaveBeenCalled();
    expect(parseSosDeepLink(window.location.search || window.location.href)).toBeTruthy();
  });

  test('does not notify when SOS alerts are disabled', () => {
    notificationService.preferences.sosAlerts = false;
    notificationService.notifySosAlert({ name: 'Sam' }, { sosId: 'sos-9', bubbleId: 'bubble-1' });
    expect(instances).toHaveLength(0);
  });
});

describe('app reopen from SOS notification', () => {
  test('deep link from a notification URL focuses the SOS event', () => {
    const link = parseSosDeepLink('/?sos=sos-reopen&bubble=bubble-1');
    expect(link).toEqual({ sosId: 'sos-reopen', bubbleId: 'bubble-1' });
  });
});
