export interface DisposableResource {
  dispose(): void;
}

export interface ResourceDisposalReport {
  disposed: number;
  byCategory: Record<string, number>;
  alreadyDisposed: boolean;
}

export class ResourceRegistry {
  private readonly resources = new Map<DisposableResource, string>();
  private disposed = false;

  own<T extends DisposableResource>(resource: T, category = 'resource'): T {
    if (this.disposed) throw new Error('Cannot register a resource after registry disposal.');
    if (!this.resources.has(resource)) this.resources.set(resource, category);
    return resource;
  }

  get size() {
    return this.resources.size;
  }

  get isDisposed() {
    return this.disposed;
  }

  dispose(): ResourceDisposalReport {
    if (this.disposed) return { disposed: 0, byCategory: {}, alreadyDisposed: true };
    this.disposed = true;
    const byCategory: Record<string, number> = {};
    for (const [resource, category] of this.resources) {
      resource.dispose();
      byCategory[category] = (byCategory[category] ?? 0) + 1;
    }
    const disposed = this.resources.size;
    this.resources.clear();
    return { disposed, byCategory, alreadyDisposed: false };
  }
}
