import { Role } from '../enums';

export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}
