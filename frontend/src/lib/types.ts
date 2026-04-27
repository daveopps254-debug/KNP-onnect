// Types matching the FastAPI backend schemas

export type UserRole = "user" | "admin" | "head_admin" | "department_head";
export type PostType = "regular" | "official" | "anonymous" | "department" | "reel";
export type NotificationType = "like" | "comment" | "follow" | "group_invite" | "post_tag" | "admin_announcement" | "department_post" | "system";
export type ReportStatus = "pending" | "resolved" | "dismissed";

export interface UserResponse {
  id: number;
  email: string;
  username: string;
  full_name: string;
  bio: string;
  profile_picture: string;
  cover_photo: string;
  phone: string;
  department_name: string;
  course: string;
  year_of_study: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  theme_preference: string;
  created_at: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
}

export interface UserProfileResponse extends UserResponse {
  is_following: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserResponse;
}

export interface PostMediaResponse {
  id: number;
  file_url: string;
  media_type: string;
}

export interface CommentResponse {
  id: number;
  content: string;
  author: UserResponse;
  parent_id: number | null;
  created_at: string;
  replies: CommentResponse[];
}

export interface PostResponse {
  id: number;
  content: string;
  post_type: PostType;
  author: UserResponse | null;
  department_id: number | null;
  group_id: number | null;
  is_pinned: boolean;
  image_url: string | null;
  video_url: string | null;
  tags: string[];
  media: PostMediaResponse[];
  comments_count: number;
  likes_count: number;
  share_count: number;
  is_liked: boolean;
  user_reaction: string | null;
  created_at: string;
}

export interface GroupResponse {
  id: number;
  name: string;
  description: string;
  cover_image: string;
  is_private: boolean;
  created_by: number;
  members_count: number;
  is_member: boolean;
  created_at: string;
}

export interface GroupMemberResponse {
  id: number;
  user: UserResponse;
  role: string;
  joined_at: string;
}

export interface GroupMessageResponse {
  id: number;
  sender: UserResponse;
  content: string;
  created_at: string;
}

export interface NotificationResponse {
  id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  sender: UserResponse | null;
  created_at: string;
}

export interface MessageResponse {
  id: number;
  sender: UserResponse;
  receiver: UserResponse;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ConversationResponse {
  user: UserResponse;
  last_message: MessageResponse | null;
  unread_count: number;
}

export interface StoryResponse {
  id: number;
  user_id: number;
  image_url: string | null;
  text_content: string | null;
  background_color: string;
  expires_at: string;
  created_at: string;
  author: UserResponse;
}

export interface StoryGroupResponse {
  user: UserResponse;
  stories: StoryResponse[];
}

export interface ReportResponse {
  id: number;
  reporter: UserResponse;
  reported_entity_type: string;
  reported_entity_id: number;
  reason: string;
  status: ReportStatus;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AdminStatsResponse {
  total_users: number;
  active_users: number;
  total_posts: number;
  total_groups: number;
  total_departments: number;
  new_users_today: number;
  new_posts_today: number;
  posts_by_type: Record<string, number>;
  users_by_role: Record<string, number>;
  registration_trend: Record<string, unknown>[];
  posts_trend: Record<string, unknown>[];
}

export interface UserSettingsResponse {
  email_notifications: boolean;
  push_notifications: boolean;
  show_online_status: boolean;
  private_profile: boolean;
  dashboard_widgets: string[] | null;
  sidebar_collapsed: boolean;
  language: string;
}
