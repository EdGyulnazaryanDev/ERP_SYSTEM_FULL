import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('ticket_integrations')
export class TicketIntegrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenant_id: string | null;

  // Slack
  @Column({ type: 'text', nullable: true })
  slack_webhook_url: string | null;

  @Column({ default: false })
  slack_on_create: boolean;

  @Column({ default: false })
  slack_on_update: boolean;

  @Column({ default: true })
  slack_on_resolve: boolean;

  // Trello
  @Column({ type: 'text', nullable: true })
  trello_api_key: string | null;

  @Column({ type: 'text', nullable: true })
  trello_token: string | null;

  @Column({ type: 'text', nullable: true })
  trello_list_id: string | null;

  @Column({ default: false })
  trello_auto_push: boolean;

  // Jira
  @Column({ type: 'text', nullable: true })
  jira_api_key: string | null;

  @Column({ type: 'text', nullable: true })
  jira_domain: string | null;

  @Column({ type: 'text', nullable: true })
  jira_email: string | null;

  // GitHub
  @Column({ type: 'text', nullable: true })
  github_token: string | null;

  @Column({ type: 'text', nullable: true })
  github_repo: string | null;

  // Stripe
  @Column({ type: 'text', nullable: true })
  stripe_secret_key: string | null;

  @Column({ type: 'text', nullable: true })
  stripe_publishable_key: string | null;

  // QuickBooks
  @Column({ type: 'text', nullable: true })
  quickbooks_client_id: string | null;

  @Column({ type: 'text', nullable: true })
  quickbooks_client_secret: string | null;

  @Column({ type: 'text', nullable: true })
  quickbooks_realm_id: string | null;

  // Google Workspace
  @Column({ type: 'text', nullable: true })
  google_workspace_service_account: string | null;

  @UpdateDateColumn()
  updated_at: Date;
}
