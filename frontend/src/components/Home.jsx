import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

const GET_USERS = gql`
  query {
    getAllUsers {
      id
      username
      email
    }
  }
`;

export default function Home() {
  const { loading, error, data } = useQuery(GET_USERS);

  if (loading) return <>Loading...</>;
  if (error) return <>Error: {error.message}</>;

  return (
    <ul>
      {data.getAllUsers.map((user) => (
        <li key={user.id}>
          {user.username} - {user.email}
        </li>
      ))}
    </ul>
  );
}