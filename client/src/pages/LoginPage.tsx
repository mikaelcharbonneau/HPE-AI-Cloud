import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Form,
  FormField,
  TextInput,
  Button,
  Text,
  Heading,
  Notification,
} from 'grommet';
import { Hpe, View, Hide } from 'grommet-icons';
import { useAuth } from '../contexts/AuthContext';

interface LoginForm {
  email: string;
  password: string;
}

function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [formData, setFormData] = useState<LoginForm>({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      await login(formData.email, formData.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleInputChange = (field: keyof LoginForm) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  return (
    <Box fill background="light-1" align="center" justify="center">
      <Card width="medium" margin="medium">
        <CardHeader 
          background="brand"
          pad="medium"
          align="center"
          justify="center"
        >
          <Box direction="row" align="center" gap="medium">
            <Hpe color="white" size="large" />
            <Box>
              <Heading level="3" margin="none" color="white">
                Datacenter Audit Tool
              </Heading>
              <Text size="small" color="white">
                HPE Internal Application
              </Text>
            </Box>
          </Box>
        </CardHeader>
        
        <CardBody pad="large">
          <Form onSubmit={handleSubmit}>
            <FormField label="Email" htmlFor="email" required>
              <TextInput
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                placeholder="Enter your HPE email"
              />
            </FormField>

            <FormField label="Password" htmlFor="password" required>
              <TextInput
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                placeholder="Enter your password"
                icon={
                  <Button
                    icon={showPassword ? <Hide /> : <View />}
                    onClick={() => setShowPassword(!showPassword)}
                    plain
                  />
                }
              />
            </FormField>

            {error && (
              <Box margin={{ top: 'small' }}>
                <Notification
                  status="critical"
                  message={error}
                  onClose={() => setError(null)}
                />
              </Box>
            )}

            <Box margin={{ top: 'medium' }}>
              <Button
                type="submit"
                primary
                fill
                label={isLoading ? 'Signing in...' : 'Sign In'}
                disabled={isLoading || !formData.email || !formData.password}
              />
            </Box>
          </Form>

          <Box margin={{ top: 'medium' }} align="center">
            <Text size="small" color="text-weak">
              Use your HPE credentials to access the system
            </Text>
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
}

export default LoginPage; 