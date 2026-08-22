const { verifySession } = require('./_auth');
const { getCredentials, batchRunReports, runRealtimeReport } = require('./_ga4');

const CHANNEL_LABELS = {
  'Direct': 'Direct',
  'Organic Search': 'Organic search',
  'Paid Search': 'Paid search',
  'Organic Social': 'Organic social',
  'Paid Social': 'Paid social',
  'Referral': 'Referral',
  'Email': 'Email',
  'Organic Video': 'Organic video',
  'Unassigned': 'Unassigned',
};

function daysToRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function rowsOf(report) {
  return report?.rows || [];
}

module.exports = async (req, res) => {
  const session = verifySession(req);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');

  let creds;
  try {
    creds = getCredentials();
  } catch (e) {
    res.status(200).json({ configured: false, message: e.message });
    return;
  }
  if (!creds) {
    res.status(200).json({ configured: false, message: 'GA4_SERVICE_ACCOUNT_JSON and GA4_PROPERTY_ID are not set.' });
    return;
  }

  const days = [7, 28, 90].includes(Number(req.query?.days)) ? Number(req.query.days) : 28;
  const dateRanges = [daysToRange(days)];

  const requests = [
    { dateRanges, metrics: [
      { name: 'activeUsers' }, { name: 'newUsers' }, { name: 'sessions' },
      { name: 'engagedSessions' }, { name: 'averageSessionDuration' }, { name: 'eventCount' },
    ] },
    { dateRanges, dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }] },
    { dateRanges, dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 10 },
    { dateRanges, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 },
    { dateRanges, dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }] },
    { dateRanges, dimensions: [{ name: 'country' }], metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 10 },
  ];

  try {
    const [totalsR, trendR, pagesR, channelsR, devicesR, countriesR] = await batchRunReports(requests);
    const realtimeUsers = await runRealtimeReport().catch(() => null);

    const totalsRow = rowsOf(totalsR)[0];
    const totals = totalsRow ? {
      activeUsers: num(totalsRow.metricValues[0].value),
      newUsers: num(totalsRow.metricValues[1].value),
      sessions: num(totalsRow.metricValues[2].value),
      engagedSessions: num(totalsRow.metricValues[3].value),
      avgSessionDuration: num(totalsRow.metricValues[4].value),
      eventCount: num(totalsRow.metricValues[5].value),
    } : { activeUsers: 0, newUsers: 0, sessions: 0, engagedSessions: 0, avgSessionDuration: 0, eventCount: 0 };
    totals.engagementRate = totals.sessions > 0 ? totals.engagedSessions / totals.sessions : 0;

    const trend = rowsOf(trendR).map((r) => ({
      date: r.dimensionValues[0].value, // YYYYMMDD
      activeUsers: num(r.metricValues[0].value),
    }));

    const topPages = rowsOf(pagesR).map((r) => ({
      path: r.dimensionValues[0].value,
      views: num(r.metricValues[0].value),
    }));

    const channels = rowsOf(channelsR).map((r) => {
      const raw = r.dimensionValues[0].value;
      return { channel: CHANNEL_LABELS[raw] || raw, sessions: num(r.metricValues[0].value) };
    });

    const devices = rowsOf(devicesR).map((r) => ({
      device: r.dimensionValues[0].value,
      users: num(r.metricValues[0].value),
    }));

    const countries = rowsOf(countriesR).map((r) => ({
      country: r.dimensionValues[0].value,
      users: num(r.metricValues[0].value),
    }));

    res.status(200).json({
      configured: true,
      range: { days, ...dateRanges[0] },
      totals,
      trend,
      topPages,
      channels,
      devices,
      countries,
      realtimeUsers,
    });
  } catch (e) {
    res.status(200).json({ configured: true, error: e.message || 'Failed to load analytics data' });
  }
};
