import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  FormField,
  Select,
  TextInput,
  Button,
  Notification,
  Nav,
} from 'grommet';
import { Previous, Next, Location } from 'grommet-icons';
import { useApi } from '../contexts/ApiContext';

interface AuditForm {
  datacenter: string;
  dataHall: string;
  walkthroughId: string;
}

const datacenters = [
  {
    name: 'Canada - Quebec',
    dataHalls: ['Island 1', 'Island 8', 'Island 9', 'Island 10', 'Island 11', 'Island 12', 'Green Nitrogen']
  },
  {
    name: 'Norway - Enebakk',
    dataHalls: ['Hall A', 'Hall B', 'Hall C']
  },
  {
    name: 'Norway - Rjukan',
    dataHalls: ['Hall 1', 'Hall 2', 'Hall 3']
  },
  {
    name: 'United States - Dallas',
    dataHalls: ['East Wing', 'West Wing', 'Central Hub']
  },
  {
    name: 'United States - Houston',
    dataHalls: ['North Building', 'South Building', 'Storage Facility']
  }
];

function NewAudit() {
  const navigate = useNavigate();
  const api = useApi();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<AuditForm>({
    datacenter: '',
    dataHall: '',
    walkthroughId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDatacenter = datacenters.find(dc => dc.name === formData.datacenter);
  const availableDataHalls = selectedDatacenter ? selectedDatacenter.dataHalls : [];

  const handleInputChange = (field: keyof AuditForm, value: string) => {
    setFormData({ 
      ...formData, 
      [field]: value,
      // Reset data hall if datacenter changes
      ...(field === 'datacenter' ? { dataHall: '' } : {})
    });
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/audits', formData);
      navigate(`/audits/${response.data.audit.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create audit');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!formData.datacenter;
      case 1:
        return !!formData.dataHall;
      case 2:
        return true; // Walkthrough ID is optional
      default:
        return false;
    }
  };

  const canProceed = isStepValid(currentStep);

  return (
    <Box fill>
      {/* Header */}
      <Box direction="row" justify="between" align="center" margin={{ bottom: 'medium' }}>
        <Box>
          <Heading level="2" margin="none">
            Walkthrough Audit #16
          </Heading>
          <Text color="text-weak">
            Set up a new datacenter audit walkthrough
          </Text>
        </Box>
        <Button
          label="Cancel"
          onClick={() => navigate('/audits')}
        />
      </Box>

      <Box direction="row" gap="large" fill>
        {/* Stepper Sidebar */}
        <Box width="medium">
          <Card height="fit-content">
            <CardHeader pad="medium" background="light-2">
              <Heading level="4" margin="none">Setup Progress</Heading>
            </CardHeader>
                         <CardBody pad="medium">
               <Nav gap="medium">
                 <Box direction="row" align="center" gap="small">
                   <Text 
                     size="small" 
                     weight={currentStep === 0 ? "bold" : "normal"}
                     color={currentStep >= 0 ? "brand" : "text-weak"}
                   >
                     1. Location Details
                   </Text>
                 </Box>
                 <Box direction="row" align="center" gap="small">
                   <Text 
                     size="small" 
                     weight={currentStep === 1 ? "bold" : "normal"}
                     color={currentStep >= 1 ? "brand" : "text-weak"}
                   >
                     2. Data Hall
                   </Text>
                 </Box>
                 <Box direction="row" align="center" gap="small">
                   <Text 
                     size="small" 
                     weight={currentStep === 2 ? "bold" : "normal"}
                     color={currentStep >= 2 ? "brand" : "text-weak"}
                   >
                     3. Confirmation
                   </Text>
                 </Box>
               </Nav>
             </CardBody>
          </Card>
        </Box>

        {/* Main Content */}
        <Box flex>
          <Card fill>
            <CardHeader pad="medium" background="light-2">
              <Box direction="row" align="center" gap="small">
                <Location size="small" />
                <Text weight="bold">
                  {currentStep === 0 && 'Location Details'}
                  {currentStep === 1 && 'Select Data Hall'}
                  {currentStep === 2 && 'Review & Start'}
                </Text>
              </Box>
            </CardHeader>
            
            <CardBody pad="large" flex>
              {error && (
                <Notification
                  status="critical"
                  message={error}
                  onClose={() => setError(null)}
                />
              )}

              {/* Step 0: Location Selection */}
              {currentStep === 0 && (
                <Box gap="medium">
                  <Text>
                    Location: Canada - Quebec
                  </Text>
                  
                  <FormField label="Select Data Center" required>
                    <Select
                      placeholder="Choose a datacenter"
                      value={formData.datacenter}
                      onChange={({ value }) => handleInputChange('datacenter', value)}
                      options={datacenters.map(dc => dc.name)}
                    />
                  </FormField>
                  
                  {formData.datacenter && (
                    <Box background="light-1" pad="medium" round="small">
                      <Text size="small" weight="bold">Selected Datacenter:</Text>
                      <Text size="small">{formData.datacenter}</Text>
                    </Box>
                  )}
                </Box>
              )}

              {/* Step 1: Data Hall Selection */}
              {currentStep === 1 && (
                <Box gap="medium">
                  <Text>
                    Location: {formData.datacenter}
                  </Text>
                  
                  <FormField label="Select Data Hall" required>
                    <Select
                      placeholder="Choose a data hall"
                      value={formData.dataHall}
                      onChange={({ value }) => handleInputChange('dataHall', value)}
                      options={availableDataHalls}
                    />
                  </FormField>
                  
                  {formData.dataHall && (
                    <Box background="light-1" pad="medium" round="small">
                      <Text size="small" weight="bold">Selected Data Hall:</Text>
                      <Text size="small">{formData.dataHall}</Text>
                    </Box>
                  )}
                </Box>
              )}

              {/* Step 2: Confirmation */}
              {currentStep === 2 && (
                <Box gap="medium">
                  <Text weight="bold">Review Audit Details</Text>
                  
                  <Box background="light-1" pad="medium" round="small" gap="small">
                    <Box direction="row" justify="between">
                      <Text size="small" weight="bold">Datacenter:</Text>
                      <Text size="small">{formData.datacenter}</Text>
                    </Box>
                    <Box direction="row" justify="between">
                      <Text size="small" weight="bold">Data Hall:</Text>
                      <Text size="small">{formData.dataHall}</Text>
                    </Box>
                  </Box>

                  <FormField 
                    label="Walkthrough ID" 
                    help="Optional: Add a custom walkthrough identifier"
                  >
                    <TextInput
                      placeholder="e.g., #16"
                      value={formData.walkthroughId}
                      onChange={(event) => handleInputChange('walkthroughId', event.target.value)}
                    />
                  </FormField>

                  <Text size="small" color="text-weak">
                    You can start adding issues and completing the audit after creation.
                  </Text>
                </Box>
              )}
            </CardBody>

            {/* Navigation */}
            <Box 
              pad="medium" 
              direction="row" 
              justify="between" 
              border={{ side: 'top', color: 'border' }}
            >
              <Button
                icon={<Previous />}
                label="Previous"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              />
              
              {currentStep < 2 ? (
                <Button
                  icon={<Next />}
                  reverse
                  label="Next"
                  primary
                  onClick={handleNext}
                  disabled={!canProceed}
                />
              ) : (
                <Button
                  label={loading ? 'Creating...' : 'Complete Audit'}
                  primary
                  onClick={handleSubmit}
                  disabled={loading}
                />
              )}
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

export default NewAudit; 