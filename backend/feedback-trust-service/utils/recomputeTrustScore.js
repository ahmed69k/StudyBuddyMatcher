const roundToTwo = (value) => Math.round(value * 100) / 100;

export const recomputeTrustScore = async (prisma, userId) => {
  const feedbackEntries = await prisma.feedback.findMany({
    where: { revieweeId: userId },
  });

  const totalReviews = feedbackEntries.length;
  const noShowCount = feedbackEntries.filter((entry) => entry.noShow).length;

  const averageRating =
    totalReviews === 0
      ? 0
      : feedbackEntries.reduce((sum, entry) => sum + entry.overallRating, 0) / totalReviews;

  const noShowRate = totalReviews === 0 ? 0 : noShowCount / totalReviews;
  const reliabilityScore =
    totalReviews === 0
      ? 0
      : ((averageRating / 5) * 0.7 + (1 - noShowRate) * 0.3) * 100;

  return prisma.trustProfile.upsert({
    where: { userId },
    create: {
      userId,
      averageRating: roundToTwo(averageRating),
      reliabilityScore: roundToTwo(reliabilityScore),
      totalReviews,
      noShowCount,
    },
    update: {
      averageRating: roundToTwo(averageRating),
      reliabilityScore: roundToTwo(reliabilityScore),
      totalReviews,
      noShowCount,
    },
  });
};
