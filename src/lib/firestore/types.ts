// Document shapes for the tennis collections. Not a product rule.

export type SelfLevel = "beginner" | "intermediate" | "advanced";
export type Format = "singles" | "doubles";
export type OpportunityStatus = "open" | "confirmed" | "cancelled";
export type InvitationResponse = "none" | "in" | "maybe" | "out";
export type MatchStatus = "scheduled" | "played" | "cancelled";
export type ResultStatus = "pending" | "confirmed" | "disputed";
export type ConnectionStatus = "pending" | "accepted" | "declined";
export type AvailabilityStatus = "active" | "cancelled";

export type Profile = {
  id: string;
  displayName: string;
  displayNameLower: string;
  avatarUrl: string | null;
  selfLevel: SelfLevel;
  rating: number;
  ratedMatches: number;
  openToNew: boolean;
  city: string;
  locationIds: string[];
  createdAt: Date;
};

export type Location = {
  id: string;
  name: string;
  city: string;
  createdAt: Date;
};

export type Connection = {
  id: string;
  requesterId: string;
  addresseeId: string;
  participantIds: string[];
  pairId: string;
  status: ConnectionStatus;
  respondedAt: Date | null;
  createdAt: Date;
};

export type MatchList = {
  id: string;
  ownerId: string;
  name: string;
  nameKey: string;
  memberIds: string[];
  createdAt: Date;
};

export type Opportunity = {
  id: string;
  hostId: string;
  participantIds: string[];
  startsAt: Date;
  durationMin: number;
  locationId: string;
  locationName: string;
  format: Format;
  note: string;
  status: OpportunityStatus;
  confirmedInvitationId: string | null;
  createdAt: Date;
};

export type Invitation = {
  id: string;
  opportunityId: string;
  hostId: string;
  inviteeId: string;
  token: string;
  response: InvitationResponse;
  respondedAt: Date | null;
  createdAt: Date;
};

export type InviteLink = {
  id: string;
  startsAt: Date;
  durationMin: number;
  format: Format;
  status: OpportunityStatus;
  locationName: string;
  hostDisplayName: string;
  hostAvatarUrl: string | null;
  inviteeDisplayName: string;
  inviteeId: string;
  invitationId: string;
  opportunityId: string;
  response: InvitationResponse;
};

export type Match = {
  id: string;
  opportunityId: string;
  hostId: string;
  opponentId: string;
  participantIds: string[];
  startsAt: Date;
  locationId: string;
  locationName: string;
  format: Format;
  status: MatchStatus;
  createdAt: Date;
};

export type Result = {
  id: string;
  matchId: string;
  reportedBy: string;
  winnerId: string;
  score: string;
  status: ResultStatus;
  confirmedBy: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
};

export type RatingHistoryRow = {
  id: string;
  profileId: string;
  matchId: string;
  opponentId: string;
  opponentName: string;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  createdAt: Date;
};

export type Availability = {
  id: string;
  profileId: string;
  startsAt: Date;
  endsAt: Date;
  locationId: string;
  locationName: string;
  format: Format;
  note: string;
  status: AvailabilityStatus;
  createdAt: Date;
};

export type NotificationType =
  | "invitation_received"
  | "match_confirmed"
  | "opportunity_closed"
  | "opportunity_cancelled"
  | "result_reported"
  | "result_confirmed"
  | "connection_requested"
  | "connection_accepted"
  | "availability_match";

export type Notification = {
  id: string;
  profileId: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  readAt: Date | null;
  createdAt: Date;
};
