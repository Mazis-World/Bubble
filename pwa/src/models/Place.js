/**
 * A saved family location with a geofence.
 * Path: /bubbles/{bubbleId}/places/{placeId}
 */
class Place {
  constructor({
    placeId,
    ownerId,
    familyBubbleId,
    name,
    type = 'custom',
    address = '',
    latitude,
    longitude,
    radiusMeters = 200,
    icon = '📍',
    color = '#818cf8',
    arrivalNotificationsEnabled = true,
    departureNotificationsEnabled = true,
    recipientUserIds = [],
    isActive = true,
    createdAt = null,
    updatedAt = null,
  }) {
    this.placeId = placeId;
    this.ownerId = ownerId;
    this.familyBubbleId = familyBubbleId;
    this.name = name;
    this.type = type;
    this.address = address;
    this.latitude = latitude;
    this.longitude = longitude;
    this.radiusMeters = radiusMeters;
    this.icon = icon;
    this.color = color;
    this.arrivalNotificationsEnabled = arrivalNotificationsEnabled;
    this.departureNotificationsEnabled = departureNotificationsEnabled;
    this.recipientUserIds = recipientUserIds;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromFirestore(docSnap) {
    const data = docSnap.data() || {};
    return new Place({
      placeId: docSnap.id,
      ownerId: data.ownerId,
      familyBubbleId: data.familyBubbleId,
      name: data.name,
      type: data.type || 'custom',
      address: data.address || '',
      latitude: data.latitude,
      longitude: data.longitude,
      radiusMeters: data.radiusMeters,
      icon: data.icon || '📍',
      color: data.color || '#818cf8',
      arrivalNotificationsEnabled: data.arrivalNotificationsEnabled !== false,
      departureNotificationsEnabled: data.departureNotificationsEnabled !== false,
      recipientUserIds: Array.isArray(data.recipientUserIds) ? data.recipientUserIds : [],
      isActive: data.isActive !== false,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
    });
  }
}

export default Place;
