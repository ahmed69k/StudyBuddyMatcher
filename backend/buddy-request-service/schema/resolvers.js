import { prisma } from "../index.js";
import { publishBuddyRequestEvent, publishNotification } from "../kafka/producer.js";

const assertAuth = (context) => {
  if (!context?.user?.id) throw new Error("Not authenticated");
};

const toIso = (d) => (d instanceof Date ? d.toISOString() : String(d));

const mapRequest = (row) => ({
  ...row,
  createdAt: toIso(row.createdAt),
  updatedAt: toIso(row.updatedAt),
});

const resolvers = {
  Query: {
    buddyRequest: async (_, { id }, context) => {
      assertAuth(context);
      const row = await prisma.buddyRequest.findUnique({ where: { id } });
      if (!row) return null;
      const uid = context.user.id;
      if (row.requesterId !== uid && row.receiverId !== uid) {
        throw new Error("Not authorized");
      }
      return mapRequest(row);
    },

    myIncomingBuddyRequests: async (_, { status }, context) => {
      assertAuth(context);
      const where = { receiverId: context.user.id };
      if (status) where.status = status;
      const rows = await prisma.buddyRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return rows.map(mapRequest);
    },

    myOutgoingBuddyRequests: async (_, { status }, context) => {
      assertAuth(context);
      const where = { requesterId: context.user.id };
      if (status) where.status = status;
      const rows = await prisma.buddyRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return rows.map(mapRequest);
    },
  },

  Mutation: {
    sendBuddyRequest: async (_, { input }, context) => {
      assertAuth(context);
      const requesterId = context.user.id;
      const { receiverId, message } = input;

      if (receiverId === requesterId) {
        throw new Error("Cannot send a buddy request to yourself");
      }

      const pendingSameDirection = await prisma.buddyRequest.findFirst({
        where: {
          requesterId,
          receiverId,
          status: "PENDING",
        },
      });
      if (pendingSameDirection) {
        throw new Error("You already have a pending request to this user");
      }

      const created = await prisma.buddyRequest.create({
        data: {
          requesterId,
          receiverId,
          message: message ?? null,
        },
      });

      await publishBuddyRequestEvent("BuddyRequestCreated", {
        id: created.id,
        requesterId,
        receiverId,
        status: created.status,
      });

      await publishNotification({
        recipient: receiverId,
        subject: "New buddy request",
        message: `User ${requesterId} sent you a study buddy request.`,
      });

      return mapRequest(created);
    },

    respondToBuddyRequest: async (_, { requestId, decision }, context) => {
      assertAuth(context);
      const uid = context.user.id;
      const row = await prisma.buddyRequest.findUnique({ where: { id: requestId } });
      if (!row) throw new Error("Buddy request not found");
      if (row.receiverId !== uid) throw new Error("Only the receiver can respond");
      if (row.status !== "PENDING") throw new Error("This request is no longer pending");

      const nextStatus = decision === "ACCEPT" ? "ACCEPTED" : "DECLINED";
      const updated = await prisma.buddyRequest.update({
        where: { id: requestId },
        data: { status: nextStatus },
      });

      const eventName =
        nextStatus === "ACCEPTED" ? "BuddyRequestAccepted" : "BuddyRequestDeclined";
      await publishBuddyRequestEvent(eventName, {
        id: updated.id,
        requesterId: updated.requesterId,
        receiverId: updated.receiverId,
        status: updated.status,
      });

      if (nextStatus === "ACCEPTED") {
        await publishNotification({
          recipient: updated.requesterId,
          subject: "Buddy request accepted",
          message: `User ${updated.receiverId} accepted your study buddy request.`,
        });
      }

      return mapRequest(updated);
    },

    cancelBuddyRequest: async (_, { requestId }, context) => {
      assertAuth(context);
      const uid = context.user.id;
      const row = await prisma.buddyRequest.findUnique({ where: { id: requestId } });
      if (!row) throw new Error("Buddy request not found");
      if (row.requesterId !== uid) throw new Error("Only the requester can cancel");
      if (row.status !== "PENDING") throw new Error("Only pending requests can be cancelled");

      const updated = await prisma.buddyRequest.update({
        where: { id: requestId },
        data: { status: "CANCELLED" },
      });

      await publishBuddyRequestEvent("BuddyRequestCancelled", {
        id: updated.id,
        requesterId: updated.requesterId,
        receiverId: updated.receiverId,
        status: updated.status,
      });

      return mapRequest(updated);
    },
  },
};

export default resolvers;
