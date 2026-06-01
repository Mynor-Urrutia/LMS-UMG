export class CustomRole {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly baseRole: string,
    public readonly isSystem: boolean,
    public readonly color: string | null,
    public readonly icon: string | null,
    public readonly permissions: string[],
    public readonly createdAt: Date,
  ) {}
}
