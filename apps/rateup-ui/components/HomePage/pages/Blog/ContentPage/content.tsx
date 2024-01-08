import { Container, Flex, Grid, MantineProvider } from "@mantine/core";
import Link from "next/link";
import { useRouter } from "next/router";

export default function ContentPage() {
  const router = useRouter();
  const handleClick = () => {
    router.push("./ContentDetails/positive");
  };
  return (
    <MantineProvider>
      <Container
        style={{
          marginRight: "5rem",
          marginTop: "5rem",
          backgroundColor: "#347aeb",
          marginBottom: "5rem",
        }}
      >
        <div style={{ display: "flex" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              marginLeft: "5rem",
              alignItems: "center",
            }}
          >
            <img
              src="/images/nurturing-positive.jpg"
              alt="Example Image"
              width={500}
              height={300}
            />
          </div>
          <div style={{ marginLeft: "5rem", marginBottom: "10rem" }}>
            <h1
              style={{ fontSize: "60px", color: "#f7f9fc", marginTop: "8rem" }}
            >
              Nurturing Positive Connections
            </h1>
            <p
              style={{
                textAlign: "justify",
                marginRight: "5rem",
                color: "white",
                fontSize: "20px",
              }}
            >
              Whether you're an individual building a personal brand or a
              business striving for success, the way you are perceived online
              can significantly impact your opportunities and relationships.{" "}
            </p>
            <button
              onClick={handleClick}
              style={{
                backgroundColor: "white",
                color: "blue",
                fontSize: "16px",
                borderRadius: "10px",
                padding: "10px 20px",
                border: "none",
              }}
            >
              Read more
            </button>
          </div>
        </div>
      </Container>
      <h1
        style={{ textAlign: "center", marginBottom: "5rem", color: "#06429c" }}
      >
        FEATURED READS
      </h1>

      <div style={{ display: "flex" }}>
        <Container style={{ marginRight: "5rem" }}>
          <img
            src="/images/laptop-image.jpg"
            alt="Example Image"
            width={500}
            height={300}
          />

          <h1 style={{ marginRight: "5rem" }}>
            Building and Managing Your Online Reputation: A Guide for Success
          </h1>
          <Link href="./ContentDetails/success"> Read more</Link>
        </Container>

        <Container style={{ marginRight: "5rem" }}>
          <img
            src="/images/financial-review.jpg"
            alt="Example Image"
            width={500}
            height={300}
          />

          <h1 style={{ marginRight: "5rem" }}>
            Transforming Financial Fortunes: The Impact of Online Reputation
            Management Tools
          </h1>
          <Link href="/ContentDetails/fin">Read more</Link>
        </Container>
      </div>
    </MantineProvider>
  );
}
