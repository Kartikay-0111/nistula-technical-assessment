-- Design Descisions:

-- Enums for channels and status
-- Using channel_type and reservation_status as enums keeps the data honest.It ensure that only valid channels and reservation statuses can be entered, which simplifies application logic and reduces bugs.

-- Guest identity split 
-- One guest can have multiple identities across channels, but they all link back to a single guest record. This allows us to maintain a unified profile for the guest while still supporting multiple platforms.
-- Keeping guest profiles separate from their channel-specific IDs. Adding a new channel later requires no schema changes.

-- Unified messages table
-- All channels feed into one messages table. It keeps the inbox query simple and means the AI always has one place to look regardless of where the message came from.

-- CHECK constraints on messages
-- The two constraints on the messages table encode actual business logic — an auto-sent message cannot also be agent-edited, and inbound messages should never carry outbound fields. 
--Catching these at the database level means the application can't accidentally violate them.

-- Indexes on the right columns 
-- Indexed last_message_at, conversation_id, and guest_id because those are the columns the inbox and conversation views will sort and filter on constantly.


-- The hardest part was figuring out how to handle the same guest showing up on different platforms. Someone might book on Airbnb and then message you on WhatsApp same person, but the system sees two different identifiers. I decided to keep one clean guest record and store each platform's ID separately. The tricky part is that the database can't automatically know these two accounts belong to the same person - the app has to figure that out. It's not a perfect solution, but the alternative was ending up with duplicate guest records everywhere, which would make the AI's job much harder and break the whole idea of a unified inbox.

CREATE TYPE channel_type AS ENUM (
    'whatsapp', 'airbnb', 'booking_com', 'instagram', 'direct'
);

CREATE TYPE msg_direction AS ENUM ('inbound', 'outbound');

CREATE TYPE reservation_status AS ENUM (
    'upcoming', 'active', 'completed', 'cancelled'
);

-- Guests table to store unified guest profiles
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone_number VARCHAR(50),
    preferences JSONB, 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Guest identities table to link guests to their channel-specific IDs
CREATE TABLE guest_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    channel channel_type NOT NULL,
    provider_guest_id VARCHAR(255) NOT NULL, 
    UNIQUE(channel, provider_guest_id)
);

-- Reservations table to store booking information
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    status reservation_status DEFAULT 'upcoming',
    villa_id VARCHAR(255) NOT NULL,
    property_name VARCHAR(255) NOT NULL,
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ NOT NULL,
    booking_ref VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table to link guests, reservations, and channels
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    channel channel_type NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Messages table to store all messages across channels
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    direction msg_direction NOT NULL,
    channel channel_type NOT NULL,
    content TEXT NOT NULL,
    external_message_id VARCHAR(255),
    sent_at TIMESTAMPTZ,  
    is_ai_drafted BOOLEAN DEFAULT FALSE,  
    is_agent_edited BOOLEAN DEFAULT FALSE, 
    is_auto_sent BOOLEAN DEFAULT FALSE,   
    ai_confidence_score DECIMAL(4,3),     
    query_type VARCHAR(100),              
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(channel, external_message_id),
    CONSTRAINT chk_outbound_logic CHECK (
        NOT (is_auto_sent = TRUE AND is_agent_edited = TRUE)
    ),
    CONSTRAINT chk_direction_data_integrity CHECK (
        (
            direction = 'inbound' 
            AND is_ai_drafted = FALSE 
            AND is_agent_edited = FALSE 
            AND is_auto_sent = FALSE
        ) 
        OR 
        (
            direction = 'outbound' 
            AND ai_confidence_score IS NULL 
            AND query_type IS NULL
        )
    )
);

-- Indexes to optimize common queries
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_conversations_guest_id ON conversations(guest_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX idx_reservations_guest_id ON reservations(guest_id);
CREATE INDEX idx_guest_identities_guest_id ON guest_identities(guest_id);