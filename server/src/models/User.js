const { prisma } = require('../lib/prisma');

const USER_FIELD_NAMES = [
  'name',
  'email',
  'password',
  'role',
  'googleSub',
  'appleSub',
  'facebookId',
  'avatarUri',
  'shop',
  'lastLoginAt',
  'loginCount',
  'emailVerified',
  'isBlocked',
  'blockedAt',
  'blockedReason',
  'refreshTokenHash',
  'refreshTokenExpiresAt',
  'passwordResetTokenHash',
  'passwordResetExpiresAt',
  'emailVerificationTokenHash',
  'emailVerificationExpiresAt',
];

const USER_SELECTABLE_FIELDS = new Set([
  'id',
  'name',
  'email',
  'password',
  'role',
  'googleSub',
  'appleSub',
  'facebookId',
  'avatarUri',
  'shop',
  'lastLoginAt',
  'loginCount',
  'emailVerified',
  'isBlocked',
  'blockedAt',
  'blockedReason',
  'refreshTokenHash',
  'refreshTokenExpiresAt',
  'passwordResetTokenHash',
  'passwordResetExpiresAt',
  'emailVerificationTokenHash',
  'emailVerificationExpiresAt',
  'createdAt',
  'updatedAt',
]);

const nullableValue = (value) => (value === undefined ? null : value);

const mapPrismaUserToDocumentData = (record) => {
  if (!record) return null;

  return {
    _id: record.id,
    id: record.id,
    name: record.name,
    email: record.email,
    password: record.password,
    role: record.role,
    googleSub: record.googleSub ?? undefined,
    appleSub: record.appleSub ?? undefined,
    facebookId: record.facebookId ?? undefined,
    avatarUri: record.avatarUri ?? undefined,
    shop: record.shop ?? undefined,
    lastLoginAt: record.lastLoginAt ?? undefined,
    loginCount: record.loginCount ?? 0,
    emailVerified: Boolean(record.emailVerified),
    isBlocked: Boolean(record.isBlocked),
    blockedAt: record.blockedAt ?? undefined,
    blockedReason: record.blockedReason ?? undefined,
    refreshTokenHash: record.refreshTokenHash ?? undefined,
    refreshTokenExpiresAt: record.refreshTokenExpiresAt ?? undefined,
    passwordResetTokenHash: record.passwordResetTokenHash ?? undefined,
    passwordResetExpiresAt: record.passwordResetExpiresAt ?? undefined,
    emailVerificationTokenHash: record.emailVerificationTokenHash ?? undefined,
    emailVerificationExpiresAt: record.emailVerificationExpiresAt ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

const prismaDataFromDocument = (document) => ({
  name: document.name,
  email: document.email,
  password: document.password,
  role: document.role,
  googleSub: nullableValue(document.googleSub),
  appleSub: nullableValue(document.appleSub),
  facebookId: nullableValue(document.facebookId),
  avatarUri: nullableValue(document.avatarUri),
  shop: nullableValue(document.shop),
  lastLoginAt: nullableValue(document.lastLoginAt),
  loginCount: document.loginCount ?? 0,
  emailVerified: Boolean(document.emailVerified),
  isBlocked: Boolean(document.isBlocked),
  blockedAt: nullableValue(document.blockedAt),
  blockedReason: nullableValue(document.blockedReason),
  refreshTokenHash: nullableValue(document.refreshTokenHash),
  refreshTokenExpiresAt: nullableValue(document.refreshTokenExpiresAt),
  passwordResetTokenHash: nullableValue(document.passwordResetTokenHash),
  passwordResetExpiresAt: nullableValue(document.passwordResetExpiresAt),
  emailVerificationTokenHash: nullableValue(document.emailVerificationTokenHash),
  emailVerificationExpiresAt: nullableValue(document.emailVerificationExpiresAt),
});

const parseRegexCondition = (value) => {
  if (!(value instanceof RegExp)) return null;
  return {
    contains: value.source,
    mode: value.flags.includes('i') ? 'insensitive' : undefined,
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

  const regexCondition = parseRegexCondition(value);
  if (regexCondition) {
    return regexCondition;
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

const parseProjectionObject = (projectionInput) => {
  if (!projectionInput || typeof projectionInput !== 'object') return null;
  return projectionInput;
};

const parseSelectString = (selectString) => {
  if (!selectString || typeof selectString !== 'string') return null;

  const fields = selectString
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (fields.length === 0) return null;

  const select = { id: true };
  fields.forEach((field) => {
    if (field === '_id' || field === 'id') {
      select.id = true;
      return;
    }

    if (field.startsWith('-')) {
      return;
    }

    if (USER_SELECTABLE_FIELDS.has(field)) {
      select[field] = true;
    }
  });

  return select;
};

const applyProjectionToRecord = (record, projectionObject) => {
  if (!projectionObject) return record;
  const output = { ...record };

  Object.entries(projectionObject).forEach(([field, flag]) => {
    if (flag === 0 || flag === false) {
      delete output[field];
    }
  });

  return output;
};

class UserDocument {
  constructor(data = {}, isNew = true) {
    USER_FIELD_NAMES.forEach((field) => {
      this[field] = data[field];
    });

    this._id = data._id || data.id;
    this.id = this._id;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.__isNew = isNew;
  }

  async save() {
    if (this.__isNew || !this._id) {
      const created = await prisma.user.create({
        data: prismaDataFromDocument(this),
      });
      Object.assign(this, mapPrismaUserToDocumentData(created));
      this.__isNew = false;
      return this;
    }

    const updated = await prisma.user.update({
      where: { id: this._id },
      data: prismaDataFromDocument(this),
    });
    Object.assign(this, mapPrismaUserToDocumentData(updated));
    this.__isNew = false;
    return this;
  }
}

class UserFindQuery {
  constructor(filter = {}, projectionObject = null) {
    this.filter = filter;
    this.projectionObject = projectionObject;
    this.selectObject = null;
    this.sortObject = { createdAt: -1 };
    this.skipValue = 0;
    this.limitValue = null;
  }

  select(selectString) {
    this.selectObject = parseSelectString(selectString);
    return this;
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
    const records = await prisma.user.findMany({
      where: normalizeWhereFilter(this.filter),
      orderBy: sanitizeSort(this.sortObject),
      skip: this.skipValue,
      take: this.limitValue ?? undefined,
      select: this.selectObject || undefined,
    });

    return records.map((record) => {
      const normalizedRecord = this.selectObject
        ? {
            ...record,
            id: record.id,
            _id: record.id,
          }
        : mapPrismaUserToDocumentData(record);

      const projected = applyProjectionToRecord(normalizedRecord, this.projectionObject);
      return projected;
    });
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class User extends UserDocument {
  constructor(data = {}) {
    super(data, true);
  }

  static hydrate(record) {
    if (!record) return null;
    return new UserDocument(mapPrismaUserToDocumentData(record), false);
  }

  static async findOne(filter = {}) {
    const record = await prisma.user.findFirst({
      where: normalizeWhereFilter(filter),
    });
    return User.hydrate(record);
  }

  static async findById(id) {
    if (!id) return null;
    const record = await prisma.user.findUnique({
      where: { id: String(id) },
    });
    return User.hydrate(record);
  }

  static find(filter = {}, projectionObject = null) {
    const parsedProjection = parseProjectionObject(projectionObject);
    return new UserFindQuery(filter, parsedProjection);
  }

  static async countDocuments(filter = {}) {
    return prisma.user.count({
      where: normalizeWhereFilter(filter),
    });
  }

  static async deleteOne(filter = {}) {
    const existing = await prisma.user.findFirst({
      where: normalizeWhereFilter(filter),
      select: { id: true },
    });

    if (!existing) {
      return { deletedCount: 0 };
    }

    await prisma.user.delete({
      where: { id: existing.id },
    });

    return { deletedCount: 1 };
  }

  static async create(data = {}) {
    const record = await prisma.user.create({
      data: {
        ...prismaDataFromDocument(data),
      },
    });

    return User.hydrate(record);
  }
}

module.exports = User;
