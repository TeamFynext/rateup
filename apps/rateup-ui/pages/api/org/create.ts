import type {NextApiRequest, NextApiResponse} from 'next';
import pool from '../../../lib/db-pool'

export default async function createOrganization(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({error: 'Method not allowed'});
    }

    const {name, user_id} = req.body;

    if (!name || !user_id) {
        return res.status(400).json({error: 'Org Name and user_id are required'});
    }

    try {
        const db = await pool.connect();
        // Check if user already has an org
        const {rows: existingOrg} = await db.query('SELECT * FROM org WHERE owner = $1', [user_id]);
        if (existingOrg.length > 0) {
            return res.status(400).json({error: 'User already has an organization'});
        }

        // Create new org
        const {rows: newOrg} = await db.query('INSERT INTO org (name, owner) VALUES ($1, $2) RETURNING id', [name, user_id]);
        if (newOrg && newOrg.length > 0) {
            const orgId = newOrg[0].id;

            // Map new org to org_users table
            await db.query('INSERT INTO org_users (org_id, user_id, role) VALUES ($1, $2, $3)', [orgId,user_id,'ORG_ADMIN']);
            
            // Update user's current org,role to profile table
            await db.query('UPDATE profile SET name = $2, current_org = $3, org_role = $4 WHERE id = $1', [user_id, name, orgId, 'ORG_ADMIN']);
            db.release();

            res.status(201).json({created_Org_id: newOrg[0].id});
        } else {
            res.status(500).json({error: 'Failed to create organization'});
        }
    } catch (error: any) {
        res.status(500).json({error: error?.message});
    }
}
