import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Voting } from "anchor/target/types/voting";
import { startAnchor } from "solana-bankrun";
import { BankrunProvider } from "anchor-bankrun";

const IDL = require("../target/idl/voting.json");

const votingAddress = new PublicKey(
  "6VNhLum7nCopsdDF6zk1NybSv7HMXKkyP8VLwDUm6Q26"
);

describe("Voting", () => {
  let context;
  let provider;
  anchor.setProvider(anchor.AnchorProvider.env());
  let votingProgram = anchor.workspace.Voting as Program<Voting>;

  beforeAll(async () => {
    // context = await startAnchor(
    //   "",
    //   [{ name: "voting", programId: votingAddress }],
    //   []
    // );
    // provider = new BankrunProvider(context);
    // votingProgram = new Program<Voting>(IDL, provider);
  });

  it("initialize poll", async () => {
    await votingProgram.methods
      .initializePoll(
        new anchor.BN(1),
        "What is your favorite type of peanut butter?",
        new anchor.BN(0),
        new anchor.BN(1744532038)
      )
      .rpc();

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      votingAddress
    );

    const poll = await votingProgram.account.poll.fetch(pollAddress);
    console.log("poll :", poll);

    expect(poll.pollId.toNumber()).toEqual(1);
    expect(poll.description).toEqual(
      "What is your favorite type of peanut butter?"
    );
    expect(poll.pollStart.toNumber()).toBeLessThan(poll.pollEnd.toNumber());
    expect(poll.candidateAmount.toNumber()).toEqual(0);
  });

  it("initialize candidate", async () => {
    await votingProgram.methods
      .initializeCandidate("Smooth", new anchor.BN(1))
      .rpc();

    await votingProgram.methods
      .initializeCandidate("Crunchy", new anchor.BN(1))
      .rpc();

    const [crunchyAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8), Buffer.from("Crunchy")],
      votingAddress
    );

    const crunchyCandidate = await votingProgram.account.candidate.fetch(
      crunchyAddress
    );
    console.log("crunchy candidate :", crunchyCandidate);
    expect(crunchyCandidate.candidateName).toEqual("Crunchy");
    expect(crunchyCandidate.candidateVotes.toNumber()).toEqual(0);

    const [smoothAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8), Buffer.from("Smooth")],
      votingAddress
    );

    const smoothCandidate = await votingProgram.account.candidate.fetch(
      smoothAddress
    );
    console.log("smooth candidate :", smoothCandidate);
    expect(smoothCandidate.candidateName).toEqual("Smooth");
    expect(smoothCandidate.candidateVotes.toNumber()).toEqual(0);
  });
  it("vote candidate", async () => {
    const pollId = 1;
    const candidateName = "Smooth";

    const [smoothAddress] = PublicKey.findProgramAddressSync(
      [
        new anchor.BN(pollId).toArrayLike(Buffer, "le", 8),
        Buffer.from(candidateName),
      ],
      votingAddress
    );

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(pollId).toArrayLike(Buffer, "le", 8)],
      votingAddress
    );

    const anchorProvider = anchor.getProvider() as anchor.AnchorProvider;

    await votingProgram.methods
      .vote(candidateName, new anchor.BN(pollId))
      .accounts({
        signer: anchorProvider.wallet.publicKey,
        // poll: pollAddress,
        // candidate: smoothAddress,
      })
      .rpc();

    const smoothCandidate = await votingProgram.account.candidate.fetch(
      smoothAddress
    );
    console.log("smooth candidate after vote:", smoothCandidate);
    expect(smoothCandidate.candidateVotes.toNumber()).toEqual(1);
  });
});
