export const INVITE_ALREADY_USED = 'This invite code has already been used.';

export const inviteIsUsed = ({ accepted, used, edgeAccepted } = {}) =>
  accepted === true || used === true || edgeAccepted === true;

export const inviteFromRecords = (invitation = {}, edge = null) =>
  inviteIsUsed({
    accepted: invitation.accepted,
    used: invitation.used,
    edgeAccepted: edge?.accepted,
  });
