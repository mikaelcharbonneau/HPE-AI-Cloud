import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Grid,
  DataTable,
  Button,
  Spinner,
  Tag,
} from 'grommet';
import {
  DocumentText,
  Alert,
  StatusGood,
  Add,
} from 'grommet-icons';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';

interface DashboardMetrics {
  completedAudits: number;
  activeIncidents: number;
  totalIssues: number;
  criticalIssues: number;
  resolvedIncidents: number;
}

interface RecentAudit {
  id: string;
  datacenter: string;
  dataHall: string;
  walkthroughId: string;
  technician: string;
  issuesCount: number;
  status: string;
  date: string;
}

interface ActiveIncident {
  id: string;
  location: string;
  description: string;
  severity: string;
  date: string;
}

interface DashboardData {
  metrics: DashboardMetrics;
  recentAudits: RecentAudit[];
  activeIncidents: ActiveIncident[];
}

function Dashboard() {
  const navigate = useNavigate();
  const api = useApi();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/dashboard/metrics');
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'status-ok';
      case 'active':
        return 'status-warning';
      case 'critical':
        return 'status-critical';
      default:
        return 'status-unknown';
    }
  };

  if (loading) {
    return (
      <Box fill align="center" justify="center">
        <Spinner size="large" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box fill align="center" justify="center">
        <Text color="status-critical">Error: {error}</Text>
        <Button margin="small" onClick={fetchDashboardData} label="Retry" />
      </Box>
    );
  }

  return (
    <Box fill gap="medium">
      {/* Header */}
      <Box direction="row" justify="between" align="center">
        <Box>
          <Heading level="2" margin="none">
            Dashboard
          </Heading>
          <Text color="text-weak">
            Welcome back, {user?.firstName} {user?.lastName}
          </Text>
        </Box>
        <Button
          icon={<Add />}
          label="Start Audit"
          primary
          onClick={() => navigate('/audits/new')}
        />
      </Box>

      {/* Metrics Cards */}
      <Grid columns="small" gap="medium">
        <Card>
          <CardHeader background="status-ok" pad="medium">
            <Box direction="row" align="center" gap="small">
              <DocumentText color="white" size="medium" />
              <Text color="white" weight="bold">Completed Audits</Text>
            </Box>
          </CardHeader>
          <CardBody pad="medium" align="center">
            <Text size="xxlarge" weight="bold">
              {data?.metrics.completedAudits || 0}
            </Text>
            <Button
              label="View all"
              plain
              size="small"
              onClick={() => navigate('/audits')}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader background="status-critical" pad="medium">
            <Box direction="row" align="center" gap="small">
              <Alert color="white" size="medium" />
              <Text color="white" weight="bold">Active Incidents</Text>
            </Box>
          </CardHeader>
          <CardBody pad="medium" align="center">
            <Text size="xxlarge" weight="bold">
              {data?.metrics.activeIncidents || 0}
            </Text>
            <Button
              label="View all"
              plain
              size="small"
              onClick={() => navigate('/incidents')}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader background="status-warning" pad="medium">
            <Box direction="row" align="center" gap="small">
              <StatusGood color="white" size="medium" />
              <Text color="white" weight="bold">Resolved Incidents</Text>
            </Box>
          </CardHeader>
          <CardBody pad="medium" align="center">
            <Text size="xxlarge" weight="bold">
              0
            </Text>
            <Button
              label="View all"
              plain
              size="small"
              onClick={() => navigate('/incidents')}
            />
          </CardBody>
        </Card>
      </Grid>

      {/* Recent Audits and Active Incidents */}
      <Grid columns={['1/2', '1/2']} gap="medium">
        {/* Recent Audits */}
        <Card>
          <CardHeader pad="medium" background="light-2">
            <Box direction="row" justify="between" align="center">
              <Heading level="4" margin="none">Recent Audits</Heading>
              <Button
                label="View All"
                size="small"
                onClick={() => navigate('/audits')}
              />
            </Box>
          </CardHeader>
          <CardBody pad="none">
            {data?.recentAudits && data.recentAudits.length > 0 ? (
              <DataTable
                columns={[
                  {
                    property: 'datacenter',
                    header: 'Datacenter',
                    primary: true,
                  },
                  {
                    property: 'dataHall',
                    header: 'Data Hall',
                  },
                  {
                    property: 'walkthroughId',
                    header: 'ID',
                  },
                  {
                    property: 'status',
                    header: 'State',
                    render: (datum: RecentAudit) => (
                      <Tag
                        value={datum.status}
                        background={getStatusColor(datum.status)}
                      />
                    ),
                  },
                  {
                    property: 'date',
                    header: 'Date',
                    render: (datum: RecentAudit) => (
                      <Text size="small">{formatDate(datum.date)}</Text>
                    ),
                  },
                ]}
                data={data.recentAudits.slice(0, 5)}
                size="small"
                onClickRow={({ datum }) => navigate(`/audits/${datum.id}`)}
              />
            ) : (
              <Box pad="medium" align="center">
                <Text>No recent audits found</Text>
              </Box>
            )}
          </CardBody>
        </Card>

        {/* Active Incidents */}
        <Card>
          <CardHeader pad="medium" background="light-2">
            <Box direction="row" justify="between" align="center">
              <Heading level="4" margin="none">Active Incidents</Heading>
              <Button
                label="View All"
                size="small"
                onClick={() => navigate('/incidents')}
              />
            </Box>
          </CardHeader>
          <CardBody pad="none">
            {data?.activeIncidents && data.activeIncidents.length > 0 ? (
              <DataTable
                columns={[
                  {
                    property: 'location',
                    header: 'Location',
                    primary: true,
                  },
                  {
                    property: 'description',
                    header: 'Description',
                    render: (datum: ActiveIncident) => (
                      <Text size="small" truncate>
                        {datum.description}
                      </Text>
                    ),
                  },
                  {
                    property: 'date',
                    header: 'Date',
                    render: (datum: ActiveIncident) => (
                      <Text size="small">{formatDate(datum.date)}</Text>
                    ),
                  },
                ]}
                data={data.activeIncidents.slice(0, 5)}
                size="small"
                onClickRow={({ datum }) => navigate(`/incidents/${datum.id}`)}
              />
            ) : (
              <Box pad="medium" align="center">
                <Text>No active incidents</Text>
              </Box>
            )}
          </CardBody>
        </Card>
      </Grid>
    </Box>
  );
}

export default Dashboard; 