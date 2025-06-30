import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  DataTable,
  Button,
  TextInput,
  Select,
  Spinner,
  Tag,
} from 'grommet';
import { Add, Search, Filter } from 'grommet-icons';
import { useApi } from '../contexts/ApiContext';

interface Audit {
  id: string;
  datacenter: string;
  data_hall: string;
  walkthrough_id: string;
  status: string;
  first_name: string;
  last_name: string;
  issues_count: number;
  created_at: string;
}

interface Filters {
  search: string;
  datacenter: string;
  status: string;
}

function AuditsList() {
  const navigate = useNavigate();
  const api = useApi();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    datacenter: '',
    status: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const itemsPerPage = 20;

  const fetchAudits = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (filters.datacenter) params.append('datacenter', filters.datacenter);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`/api/audits?${params.toString()}`);
      setAudits(response.data.audits);
      setHasMore(response.data.pagination.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audits');
    } finally {
      setLoading(false);
    }
  }, [api, currentPage, filters.datacenter, filters.status, itemsPerPage]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters({ ...filters, [field]: value });
    setCurrentPage(1); // Reset to first page when filtering
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'status-ok';
      case 'active':
        return 'status-warning';
      case 'cancelled':
        return 'status-critical';
      default:
        return 'status-unknown';
    }
  };

  const filteredAudits = audits.filter((audit) => {
    const matchesSearch = !filters.search || 
      audit.datacenter.toLowerCase().includes(filters.search.toLowerCase()) ||
      audit.data_hall.toLowerCase().includes(filters.search.toLowerCase()) ||
      audit.walkthrough_id?.toLowerCase().includes(filters.search.toLowerCase()) ||
      `${audit.first_name} ${audit.last_name}`.toLowerCase().includes(filters.search.toLowerCase());

    return matchesSearch;
  });

  if (loading && currentPage === 1) {
    return (
      <Box fill align="center" justify="center">
        <Spinner size="large" />
      </Box>
    );
  }

  return (
    <Box fill gap="medium">
      {/* Header */}
      <Box direction="row" justify="between" align="center">
        <Box>
          <Heading level="2" margin="none">
            Audits
          </Heading>
          <Text color="text-weak">
            View and manage datacenter audits
          </Text>
        </Box>
        <Button
          icon={<Add />}
          label="Start Audit"
          primary
          onClick={() => navigate('/audits/new')}
        />
      </Box>

      {/* Filters */}
      <Card>
        <CardHeader pad="medium" background="light-2">
          <Box direction="row" align="center" gap="small">
            <Filter size="small" />
            <Text weight="bold">Filters</Text>
          </Box>
        </CardHeader>
        <CardBody pad="medium">
          <Box direction="row" gap="medium" wrap>
            <Box width="medium">
              <Text size="small" margin={{ bottom: 'xsmall' }}>Search</Text>
              <TextInput
                icon={<Search />}
                placeholder="Search audits..."
                value={filters.search}
                onChange={(event) => handleFilterChange('search', event.target.value)}
              />
            </Box>
            <Box width="small">
              <Text size="small" margin={{ bottom: 'xsmall' }}>Datacenter</Text>
              <Select
                placeholder="All Datacenters"
                value={filters.datacenter}
                onChange={({ value }) => handleFilterChange('datacenter', value)}
                options={[
                  'Canada - Quebec',
                  'Norway - Enebakk',
                  'Norway - Rjukan',
                  'United States - Dallas',
                  'United States - Houston',
                ]}
                clear
              />
            </Box>
            <Box width="small">
              <Text size="small" margin={{ bottom: 'xsmall' }}>Status</Text>
              <Select
                placeholder="All Status"
                value={filters.status}
                onChange={({ value }) => handleFilterChange('status', value)}
                options={['active', 'completed', 'cancelled']}
                clear
              />
            </Box>
          </Box>
        </CardBody>
      </Card>

      {/* Audits Table */}
      <Card>
        <CardBody pad="none">
          {error ? (
            <Box pad="medium" align="center">
              <Text color="status-critical">Error: {error}</Text>
              <Button margin="small" onClick={fetchAudits} label="Retry" />
            </Box>
          ) : filteredAudits.length > 0 ? (
            <>
              <DataTable
                columns={[
                  {
                    property: 'datacenter',
                    header: 'Datacenter',
                    primary: true,
                    size: 'medium',
                  },
                  {
                    property: 'data_hall',
                    header: 'Data Hall',
                    size: 'small',
                  },
                  {
                    property: 'walkthrough_id',
                    header: 'Issues Reported',
                    render: (datum: Audit) => (
                      <Text>{datum.issues_count || 0}</Text>
                    ),
                    size: 'xsmall',
                  },
                  {
                    property: 'status',
                    header: 'State',
                    render: (datum: Audit) => (
                      <Tag
                        value={datum.status}
                        background={getStatusColor(datum.status)}
                      />
                    ),
                    size: 'xsmall',
                  },
                  {
                    property: 'walkthrough_id',
                    header: 'Walkthrough ID',
                    size: 'xsmall',
                  },
                  {
                    property: 'technician',
                    header: 'Technician',
                    render: (datum: Audit) => (
                      <Text>{datum.first_name} {datum.last_name}</Text>
                    ),
                    size: 'small',
                  },
                  {
                    property: 'created_at',
                    header: 'Date',
                    render: (datum: Audit) => (
                      <Text size="small">{formatDate(datum.created_at)}</Text>
                    ),
                    size: 'small',
                  },
                ]}
                data={filteredAudits}
                onClickRow={({ datum }) => navigate(`/audits/${datum.id}`)}
                border={{ body: 'horizontal' }}
              />
              
                             {/* Pagination */}
               {(currentPage > 1 || hasMore) && (
                 <Box pad="medium" align="center" direction="row" gap="small">
                   <Button
                     label="Previous"
                     disabled={currentPage === 1}
                     onClick={() => setCurrentPage(currentPage - 1)}
                   />
                   <Text>Page {currentPage}</Text>
                   <Button
                     label="Next"
                     disabled={!hasMore}
                     onClick={() => setCurrentPage(currentPage + 1)}
                   />
                 </Box>
               )}
            </>
          ) : (
            <Box pad="large" align="center">
              <Text>No audits found</Text>
              <Button
                margin="small"
                label="Start First Audit"
                onClick={() => navigate('/audits/new')}
              />
            </Box>
          )}
        </CardBody>
      </Card>
    </Box>
  );
}

export default AuditsList; 