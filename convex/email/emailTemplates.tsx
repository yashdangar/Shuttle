import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
} from "@react-email/components";

type AccountCredentialsEmailProps = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "frontdesk" | "driver";
  loginUrl: string;
};

const roleLabels = {
  admin: "Administrator",
  frontdesk: "Front Desk Staff",
  driver: "Driver",
};

export const AccountCredentialsEmail = ({
  name,
  email,
  password,
  role,
  loginUrl,
}: AccountCredentialsEmailProps) => {
  const roleLabel = roleLabels[role];

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={heading}>
              Welcome to Shuttle Management System
            </Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>Hello {name},</Text>

            <Text style={text}>
              Your {roleLabel} account has been created successfully. You can
              now access the system using the credentials below:
            </Text>

            <Section style={credentialsBox}>
              <Text style={label}>Email:</Text>
              <Text style={value}>{email}</Text>

              <Text style={label}>Password:</Text>
              <Text style={passwordValue}>{password}</Text>
            </Section>

            <Text style={warningText}>
              ⚠️ For security reasons, please change your password immediately
              after your first login.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={loginUrl}>
                Login to System
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={footerText}>
              If you did not expect this email, please contact your system
              administrator.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  backgroundColor: "#000000",
  padding: "32px 24px",
  textAlign: "center" as const,
};

const heading = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0",
  lineHeight: "1.4",
};

const content = {
  padding: "32px 24px",
};

const text = {
  color: "#333333",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const credentialsBox = {
  backgroundColor: "#f8f9fa",
  border: "1px solid #e9ecef",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
};

const label = {
  color: "#666666",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 8px 0",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const value = {
  color: "#333333",
  fontSize: "16px",
  fontWeight: "500",
  margin: "0 0 20px 0",
  fontFamily: "monospace",
  backgroundColor: "#ffffff",
  padding: "8px 12px",
  borderRadius: "4px",
  border: "1px solid #dee2e6",
};

const passwordValue = {
  color: "#d63384",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0",
  fontFamily: "monospace",
  backgroundColor: "#fff5f8",
  padding: "12px",
  borderRadius: "4px",
  border: "2px solid #f8d7da",
  textAlign: "center" as const,
};

const warningText = {
  color: "#856404",
  backgroundColor: "#fff3cd",
  border: "1px solid #ffeaa7",
  borderRadius: "6px",
  padding: "12px 16px",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "24px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#000000",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
  border: "none",
};

const divider = {
  borderColor: "#e9ecef",
  margin: "32px 0",
};

const footerText = {
  color: "#666666",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
  textAlign: "center" as const,
};
