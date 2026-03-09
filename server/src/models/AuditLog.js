const { prisma } = require('../lib/prisma');

const nullableValue = (value) => (value === undefined ? null : value);

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const mapPrismaAuditLogToDocumentData = (record) => {
  if (!record) return null;

  return {
    _id: record.id,
    id: record.id,
    actorUserId: record.actorUserId,
    actorEmail: record.actorEmail,
    action: record.action,
    targetUserId: record.targetUserId ?? undefined,
    metadata: record.metadata ?? undefined,
    ipAddress: record.ipAddress ?? undefined,
    userAgent: record.userAgent ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

const parseFilterCondition = (value) => {
  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const range = {};

    if ('$gt' in value) range.gt = value.$gt;
    if ('$gte' in value) range.gte = value.$gte;
    if ('$lt' in value) range.lt = value.$lt;
    if ('$lte' in value) range.lte = value.$lte;
    if ('$in' in value && Array.isArray(value.$in)) range.in = value.$in;

    if (Object.keys(range).length > 0) {
      return range;
    }
  }

  return value;
};

const normalizeWhereFilter = (filter = {}) => {
  const where = {};

  Object.entries(filter).forEach(([key, value]) => {
    if (key === '$or' && Array.isArray(value)) {
      where.OR = value.map((item) => normalizeWhereFilter(item));
      return;
    }

    if (key === '$and' && Array.isArray(value)) {
      where.AND = value.map((item) => normalizeWhereFilter(item));
      return;
    }

    const normalizedKey = key === '_id' ? 'id' : key;
    where[normalizedKey] = parseFilterCondition(value);
  });

  return where;
};

const sanitizeSort = (sortInput = {}) => {
  const [field, direction] = Object.entries(sortInput)[0] || [];
  if (!field) return [{ createdAt: 'desc' }];
  const normalizedField = field === '_id' ? 'id' : field;
  return [{ [normalizedField]: direction === -1 ? 'desc' : 'asc' }];
};

class AuditLogFindQuery {
  constructor(filter = {}) {
    this.filter = filter;
    this.sortObject = { createdAt: -1 };
    this.skipValue = 0;
    this.limitValue = null;
  }

  sort(sortObject) {
    this.sortObject = sortObject || this.sortObject;
    return this;
  }

  skip(value) {
    this.skipValue = Number(value) > 0 ? Number(value) : 0;
    return this;
  }

  limit(value) {
    const parsed = Number(value);
    this.limitValue = parsed > 0 ? parsed : null;
    return this;
  }

  async exec() {
    const records = await prisma.auditLog.findMany({
      where: normalizeWhereFilter(this.filter),
      orderBy: sanitizeSort(this.sortObject),
      skip: this.skipValue,
      take: this.limitValue ?? undefined,
    });

    return records.map(mapPrismaAuditLogToDocumentData);
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class AuditLog {
  static async create(data = {}) {
    const record = await prisma.auditLog.create({
      data: {
        actorUserId: String(data.actorUserId),
        actorEmail: normalizeEmail(data.actorEmail),
        action: String(data.action),
        targetUserId: data.targetUserId ? String(data.targetUserId) : null,
        metadata: nullableValue(data.metadata),
        ipAddress: nullableValue(data.ipAddress),
        userAgent: nullableValue(data.userAgent),
      },
    });

    return mapPrismaAuditLogToDocumentData(record);
  }

  static find(filter = {}) {
    return new AuditLogFindQuery(filter);
  }

  static async countDocuments(filter = {}) {
    return prisma.auditLog.count({
      where: normalizeWhereFilter(filter),
    });
  }
}

module.exports = AuditLog;
