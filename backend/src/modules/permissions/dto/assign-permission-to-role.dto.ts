import { IsUUID } from 'class-validator';

export class AssignPermissionToRoleDto {
  @IsUUID()
  permissionId: string;
}
