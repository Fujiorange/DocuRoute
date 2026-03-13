import * as React from "react";
import { Html, Head, Body, Container, Text, Heading } from "@react-email/components";

interface WelcomeEmailProps {
  name: string;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading>Welcome to DocuRoute</Heading>
          <Text>Hello {name}, welcome to DocuRoute — document management for regulated heavy industries.</Text>
        </Container>
      </Body>
    </Html>
  );
}
