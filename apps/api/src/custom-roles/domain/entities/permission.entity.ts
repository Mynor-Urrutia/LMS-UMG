export class Permission {
  constructor(
    public readonly id: string,
    public readonly key: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly group: string,
  ) {}
}
