import type { Platform } from "@/lib/platforms";

export type OrgRole = "owner" | "admin" | "member";
export type ChannelStatus = "disconnected" | "connected" | "expired" | "error";
export type PostStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "rejected";
export type TargetStatus = "draft" | "ready" | "publishing" | "published" | "failed";
export type JobStatus = "pending" | "running" | "succeeded" | "failed";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row> & Record<string, unknown>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
};

export type Project = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  website_url: string | null;
  industry: string | null;
  tone_of_voice: string | null;
  target_audience: string | null;
  goals: string | null;
  visual_guidelines: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type ContentPillar = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Channel = {
  id: string;
  project_id: string;
  platform: Platform;
  status: ChannelStatus;
  account_label: string | null;
  external_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  meta: Json;
  created_at: string;
  updated_at: string;
};

export type ChannelPublic = Omit<Channel, "access_token" | "refresh_token">;

export type Post = {
  id: string;
  project_id: string;
  pillar_id: string | null;
  topic: string;
  title: string | null;
  explanation: string | null;
  visual_brief: string | null;
  scheduled_at: string;
  timezone: string;
  status: PostStatus;
  created_at: string;
  updated_at: string;
};

export type PostTarget = {
  id: string;
  post_id: string;
  platform: Platform;
  content: string;
  hashtags: string[];
  status: TargetStatus;
  remote_id: string | null;
  last_error: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Media = {
  id: string;
  project_id: string;
  post_id: string | null;
  platform: Platform | null;
  storage_path: string | null;
  public_url: string;
  created_at: string;
};

export type PublishJob = {
  id: string;
  post_target_id: string;
  status: JobStatus;
  scheduled_for: string;
  idempotency_key: string;
  attempts: number;
  claimed_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalyticsSnapshot = {
  id: string;
  post_target_id: string;
  captured_at: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  raw: Json;
};

export type PostWithTargets = Post & {
  post_targets: PostTarget[];
  media: Media[];
};

export type Database = {
  public: {
    Tables: {
      organizations: Table<Organization, Pick<Organization, "name" | "slug">>;
      organization_members: Table<
        OrganizationMember,
        Pick<OrganizationMember, "organization_id" | "user_id" | "role">
      >;
      projects: Table<
        Project,
        Pick<Project, "organization_id" | "name" | "slug"> & Partial<Project>
      >;
      content_pillars: Table<
        ContentPillar,
        Pick<ContentPillar, "project_id" | "name"> & Partial<ContentPillar>
      >;
      channels: Table<Channel, Pick<Channel, "project_id" | "platform"> & Partial<Channel>>;
      posts: Table<Post, Pick<Post, "project_id" | "topic" | "scheduled_at"> & Partial<Post>>;
      post_targets: Table<
        PostTarget,
        Pick<PostTarget, "post_id" | "platform"> & Partial<PostTarget>
      >;
      media: Table<Media, Pick<Media, "project_id" | "public_url"> & Partial<Media>>;
      publish_jobs: Table<
        PublishJob,
        Pick<PublishJob, "post_target_id" | "scheduled_for" | "idempotency_key"> &
          Partial<PublishJob>
      >;
      analytics_snapshots: Table<
        AnalyticsSnapshot,
        Pick<AnalyticsSnapshot, "post_target_id"> & Partial<AnalyticsSnapshot>
      >;
      platform_interest: Table<{
        id: string;
        organization_id: string;
        platform: string;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      ensure_personal_organization: {
        Args: Record<string, never>;
        Returns: string;
      };
      claim_publish_jobs: {
        Args: { batch_size?: number };
        Returns: PublishJob[];
      };
      is_org_member: {
        Args: { _org_id: string };
        Returns: boolean;
      };
      can_access_project: {
        Args: { _project_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
