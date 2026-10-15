import { DriveFile } from '../types/index.ts';

// Sample Drive documents for instant testing
export const SAMPLE_DRIVE_DOCUMENTS = [
  {
    id: 'sample-doc-1',
    name: 'Lecture 12: Cellular Respiration, Glycolysis & ATP Synthase.gdoc',
    mimeType: 'application/vnd.google-apps.document',
    content: `Cellular respiration is the biochemical pathway by which organisms synthesize ATP from glucose.
Key Stages:
1. Glycolysis in cytoplasm: 1 glucose molecule is cleaved into 2 pyruvate molecules, yielding a net of 2 ATP and 2 NADH.
2. Pyruvate Oxidation: Pyruvate moves into the mitochondrial matrix and converts into Acetyl-CoA, releasing CO2.
3. Krebs Cycle (Citric Acid Cycle): Acetyl-CoA enters a cyclic series of enzymatic reactions, generating 2 ATP, 6 NADH, and 2 FADH2.
4. Oxidative Phosphorylation & Electron Transport Chain (ETC): High-energy electrons flow through complexes I-IV on the inner mitochondrial membrane. This pumps protons (H+) from the matrix into the intermembrane space, building a steep electrochemical proton-motive force.
5. Chemiosmosis: Protons rush back through the rotor shaft of ATP Synthase, mechanically turning the enzyme to phosphorylate ADP + Pi into ~28-32 ATP molecules. Oxygen acts as the final electron acceptor, forming water (H2O). If oxygen is absent, the ETC halts and cells resort to anaerobic fermentation.`,
  },
  {
    id: 'sample-doc-2',
    name: 'CS450: Distributed Consensus & The Raft Protocol.gdoc',
    mimeType: 'application/vnd.google-apps.document',
    content: `Distributed Consensus solves the problem of getting a cluster of unreliable servers to agree on a sequence of state transitions (replicated state machine).
The Raft Consensus Algorithm decomposes consensus into three independent sub-problems:
1. Leader Election: Nodes start as Followers. If a follower misses a heartbeat timeout (randomized 150-300ms to avoid split votes), it becomes a Candidate and requests votes. A candidate receiving votes from a majority (N/2 + 1) becomes Leader.
2. Log Replication: The Leader accepts client commands, appends them to its local log, and issues AppendEntries RPCs to all followers. Once a log entry is replicated on a majority of nodes, the leader commits it and applies it to its state machine.
3. Safety & Election Invariants: If a leader commits an entry, that entry is guaranteed to be present in all future leaders (Leader Completeness). A candidate can only win an election if its log is at least as up-to-date as the majority voters.
Partition tolerance: In a network partition, the partition containing a strict majority continues making progress; the minority partition cannot commit writes.`,
  },
  {
    id: 'sample-doc-3',
    name: 'ML601: Neural Network Backpropagation & Gradient Descent.txt',
    mimeType: 'text/plain',
    content: `Backpropagation is the computational engine of modern deep learning, calculating the gradient of the loss function with respect to every weight in a multi-layer perceptron using the multivariable chain rule of calculus.
Key Concepts:
1. Forward Pass: Input vector x is passed through successive linear transformations (W*x + b) and non-linear activation functions (ReLU, GELU, Sigmoid) to generate predictions y_hat.
2. Loss Calculation: A scalar objective (e.g., Mean Squared Error or Cross-Entropy Loss) quantifies error between prediction and ground truth.
3. Backward Pass & Chain Rule: By computing the partial derivative of Loss with respect to output activations, we propagate errors backwards layer by layer.
4. Vanishing & Exploding Gradients: Deep networks with saturating activations (like sigmoid) suffer from exponentially decaying gradients as repeated multiplications of small fractions tend to zero, preventing early layers from updating.
5. Optimizers: SGD uses noisy single-sample estimates, while Adam combines momentum (exponentially decaying moving average of past gradients) and RMSProp (adaptive learning rates per parameter based on squared gradients).`,
  },
];

export async function fetchDriveFiles(accessToken: string): Promise<DriveFile[]> {
  if (!accessToken || !accessToken.trim()) {
    throw new Error('INSUFFICIENT_DRIVE_PERMISSIONS');
  }
  try {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('pageSize', '25');
    url.searchParams.set('fields', 'files(id, name, mimeType, modifiedTime, iconLink, size)');
    url.searchParams.set(
      'q',
      "trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain' or mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.presentation')"
    );
    url.searchParams.set('orderBy', 'modifiedTime desc');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.warn('Google Drive API response:', res.status, errBody);
      if (res.status === 403 || res.status === 401) {
        throw new Error('INSUFFICIENT_DRIVE_PERMISSIONS');
      }
      throw new Error(`Google Drive API error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Failed to fetch Drive files:', err);
    throw err;
  }
}

export async function fetchDriveFileContent(accessToken: string, file: DriveFile): Promise<string> {
  try {
    let url: string;
    if (file.mimeType === 'application/vnd.google-apps.document') {
      // Export Google Doc as plain text
      url = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`;
    } else {
      // Direct media download
      url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch file content: ${res.statusText}`);
    }

    const isPdf = file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isDocx = file.name.toLowerCase().endsWith('.docx');

    if (isPdf || isDocx) {
      const blob = await res.blob();
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] || '');
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;

      const extractRes = await fetch('/api/extract-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          mimeType: file.mimeType,
          filename: file.name,
        }),
      });

      if (!extractRes.ok) {
        const errJson = await extractRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to extract text from Google Drive document');
      }

      const data = await extractRes.json();
      return data.text || '';
    }

    return await res.text();
  } catch (err) {
    console.error('Error fetching file content from Drive:', err);
    throw err;
  }
}
