import HashRedirect from "@/components/HashRedirect";

/** Was a page of its own; it's the Requests tab of the dock's Chats block now. */
export default function RequestsRedirect() {
  return <HashRedirect to="/#/chats?f=requests" />;
}
